import { EncryptedInstance, MongoRecord, EncryptedAccount, EncryptedPassword } from '../../../../../app/database/db-types';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest, isErr } from '../../../../lib/util';
import { ERRS, decrypt, decryptWithSalt, hash, pad } from '../../../../../app/lib/crypto';
import { RESET_KEY_LENGTH } from '../../../../../app/lib/constants';
import { genRandomString } from '../../../../../app/lib/util';
import { DEFAULT_EMAIL } from '../../../../lib/consts';
import { getDB } from '../../../../lib/db';
import { test } from 'ava';

const uris = captureURIs(test);
test('can generate a new key and then reset with it', async t => {
	const initialResetKey = genRandomString(RESET_KEY_LENGTH);
	const config = await genUserAndDb(t, {
		resetKey: initialResetKey
	});
	const server = await createServer(config);
	const { 
		http, 
		uri, 
		server_public_key,
		instance_id,
		userpw,
		dbpw
	} = config;
	uris.push(uri);
	
	const newResetKey = await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/user/genresetkey', {
			instance_id: instance_id.toHexString()
		}, {
			reset_key: initialResetKey,
			master_password: userpw
		}));

		t.true(response.success, 'request succeeded');
		if (response.success === false) return;
		
		const data = response.data;
		t.is(typeof data.new_reset_key, 'string', 'reset key is a string');

		const { db, done } = await getDB(uri);
		const instance = await db.collection('instances').findOne({
			_id: instance_id
		}) as MongoRecord<EncryptedInstance>;
		const { reset_key } = await db.collection('users').findOne({
			_id: instance.user_id
		}) as MongoRecord<EncryptedAccount>;
		const dbDecryptedResetKey = decrypt(reset_key, dbpw);
		done();

		t.not(dbDecryptedResetKey, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		if (dbDecryptedResetKey === ERRS.INVALID_DECRYPT) return;

		const decryptedResetKey = decrypt(dbDecryptedResetKey, data.new_reset_key);
		t.not(decryptedResetKey, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		if (decryptedResetKey === ERRS.INVALID_DECRYPT) return;

		t.true(decryptedResetKey.integrity, 'integrity is preserved');
		t.is(decryptedResetKey.pw, userpw, 'passwords match');

		return data.new_reset_key;
	})();

	await (async () => {
		const newMasterPassword = genRandomString(25);
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http, 
			publicKey: server_public_key 
		}, '/api/user/reset', {
			instance_id: instance_id.toHexString()
		}, {
			email: DEFAULT_EMAIL,
			reset_key: newResetKey!,
			newmasterpassword: newMasterPassword
		}));

		server.kill();

		t.true(response.success, 'request succeeded');
		if (response.success === false) return;
		
		const data = response.data;
		t.is(typeof data.new_reset_key, 'string', 'reset key is a string');

		//Check if those changes were actually made
		const { db, done } = await getDB(uri);
		const account = await db.collection('users').findOne({
			email: DEFAULT_EMAIL
		}) as MongoRecord<EncryptedAccount>|null;
		t.not(account, null, 'account is not null');
		if (account === null) return;

		const passwords = await db.collection('passwords').find({
			user_id: account._id
		}).toArray() as MongoRecord<EncryptedPassword>[]|null;
		t.not(passwords, null, 'passwords are not null');
		if (passwords === null) return;

		const instances = await db.collection('instances').find({
			user_id: account._id
		}).toArray() as MongoRecord<EncryptedInstance>[]|null;
		t.not(instances, null, 'instances are not null');
		if (instances === null) return;
		done();

		//Can decrypt the password data
		for (const { encrypted, twofactor_enabled } of passwords) {
			const decryptedtwofactor = decryptWithSalt(twofactor_enabled, dbpw);
			t.not(decryptedtwofactor, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			t.is(decryptedtwofactor, false, '2FA was disabled');

			const dbDecrypted = decrypt(encrypted, dbpw);
			t.not(dbDecrypted, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
			if (dbDecrypted === ERRS.INVALID_DECRYPT) return;

			const pwDecrypted = decrypt(dbDecrypted, hash(pad(newMasterPassword, 'masterpwdecrypt')));
			t.not(pwDecrypted, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		}

		for (const { twofactor_enabled } of instances) {
			const decryptedtwofactor = decryptWithSalt(twofactor_enabled, dbpw);
			t.not(decryptedtwofactor, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			t.is(decryptedtwofactor, false, '2FA was disabled');
		}

		const decryptedPw = decrypt(account.pw, dbpw);
		if (isErr(t, decryptedPw)) return;

		t.is(decryptedPw, hash(pad(newMasterPassword, 'masterpwverify')),
			'decrypted password matches new password');
		
		const dbDecryptedResetKey = decrypt(account.reset_key, dbpw);
		if (isErr(t, dbDecryptedResetKey)) return;
		const decryptedResetKey = decrypt(dbDecryptedResetKey, data.new_reset_key);
		if (isErr(t, decryptedResetKey)) return;
		t.true(decryptedResetKey.integrity, 'integrity is true');
		t.is(decryptedResetKey.pw, newMasterPassword, 'new master password can be decrypted');
	})();
});