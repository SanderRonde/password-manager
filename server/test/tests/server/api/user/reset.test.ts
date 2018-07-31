import { EncryptedAccount, MongoRecord, EncryptedPassword, EncryptedInstance } from '../../../../../app/../../shared/types/db-types';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest, isErr } from '../../../../lib/util';
import { decryptWithSalt, ERRS, decrypt, hash, pad } from '../../../../../app/lib/crypto';
import { RESET_KEY_LENGTH, DEFAULT_EMAIL } from '../../../../../app/lib/constants';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { genRandomString } from '../../../../../app/lib/util';
import { API_ERRS } from '../../../../../app/../../shared/types/api';
import { getDB } from '../../../../lib/db';
import { test } from 'ava';

const uris = captureURIs(test);
testParams(test, uris, '/api/user/reset', {
	instance_id: 'string',
}, {}, {
	reset_key: 'string',
	email: 'string',
	newmasterpassword: 'string'
}, {});
test('fails if email is wrong', async t => {
	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const config = await genUserAndDb(t, {
		resetKey
	});
	const server = await createServer(config);
	const { 
		http, 
		uri, 
		instance_id,
		server_public_key
	} = config;
	uris.push(uri);

	await testInvalidCredentials(t, {
		route: '/api/user/reset',
		port: http,
		unencrypted: {
			instance_id: instance_id.toHexString()
		},
		encrypted: {
			email: 'somewrongemail',
		reset_key: resetKey,
		newmasterpassword: 'masterpassword'
		},
		server: server,
		publicKey: server_public_key
	});
});
test('works if params are correct', async t => {
	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const newMasterPassword = genRandomString(25);
	const config = await genUserAndDb(t, {
		resetKey
	});
	const server = await createServer(config);
	const { 
		http, 
		uri, 
		instance_id, 
		dbpw,
		server_public_key
	} = config;
	uris.push(uri);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http, 
		publicKey: server_public_key 
	}, '/api/user/reset', {
		instance_id: instance_id.toHexString()
	}, {
		email: DEFAULT_EMAIL,
		reset_key: resetKey,
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
});
test('cancels if failing on password changes', async t => {
	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const newMasterPassword = genRandomString(25);
	const config = await genUserAndDb(t, {
		resetKey
	});
	const server = await createServer(config, {
		FAIL_ON_PASSWORDS: true
	});
	const { 
		http, 
		uri, 
		instance_id, 
		dbpw,
		server_public_key,
		userpw
	} = config;
	uris.push(uri);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http, 
		publicKey: server_public_key
	}, '/api/user/reset', {
		instance_id: instance_id.toHexString()
	}, {
		email: DEFAULT_EMAIL,
		reset_key: resetKey,
		newmasterpassword: newMasterPassword
	}));

	server.kill();

	t.false(response.success, 'request failed');
	if (response.success === true) return;
	
	t.is(response.ERR, API_ERRS.SERVER_ERROR, 'threw a server error');

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
	for (const { encrypted } of passwords) {
		const dbDecrypted = decrypt(encrypted, dbpw);
		t.not(dbDecrypted, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (dbDecrypted === ERRS.INVALID_DECRYPT) return;

		const pwDecrypted = decrypt(dbDecrypted, hash(pad(newMasterPassword, 'masterpwdecrypt')));
		t.is(pwDecrypted, ERRS.INVALID_DECRYPT, 'is an invalid decrypt');
	}

	t.not(instances.map((instance) => {
		return decryptWithSalt(instance.twofactor_enabled, dbpw);
	}).length, 0, 'not a single instance has 2FA enabled');

	const decryptedPw = decrypt(account.pw, dbpw);
	if (isErr(t, decryptedPw)) return;

	t.not(decryptedPw, hash(pad(newMasterPassword, 'masterpwverify')),
		'decrypted does not match new password');
	t.is(decryptedPw, hash(pad(userpw, 'masterpwverify')),
		'decrypte password is the same as the old one')
	
	const dbDecryptedResetKey = decrypt(account.reset_key, dbpw);
	if (isErr(t, dbDecryptedResetKey)) return;
	const decryptedResetKey = decrypt(dbDecryptedResetKey, resetKey);
	t.not(decryptedResetKey, ERRS.INVALID_DECRYPT, 'old reset key can still be used');
});
test('cancels if failing on instance changes', async t => {
	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const newMasterPassword = genRandomString(25);
	const config = await genUserAndDb(t, {
		resetKey
	});
	const server = await createServer(config, {
		FAIL_ON_INSTANCE: true
	});
	const { 
		http, 
		uri, 
		instance_id, 
		dbpw,
		server_public_key,
		userpw
	} = config;
	uris.push(uri);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/user/reset', {
		instance_id: instance_id.toHexString()
	}, {
		email: DEFAULT_EMAIL,
		reset_key: resetKey,
		newmasterpassword: newMasterPassword
	}));

	server.kill();

	t.false(response.success, 'request failed');
	if (response.success === true) return;
	
	t.is(response.ERR, API_ERRS.SERVER_ERROR, 'threw a server error');

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
	for (const { encrypted } of passwords) {
		const dbDecrypted = decrypt(encrypted, dbpw);
		t.not(dbDecrypted, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (dbDecrypted === ERRS.INVALID_DECRYPT) return;

		const pwDecrypted = decrypt(dbDecrypted, hash(pad(newMasterPassword, 'masterpwdecrypt')));
		t.is(pwDecrypted, ERRS.INVALID_DECRYPT, 'is an invalid decrypt');
	}

	t.not(instances.map((instance) => {
		return decryptWithSalt(instance.twofactor_enabled, dbpw);
	}).length, 0, 'not a single instance has 2FA enabled');

	const decryptedPw = decrypt(account.pw, dbpw);
	if (isErr(t, decryptedPw)) return;

	t.not(decryptedPw, hash(pad(newMasterPassword, 'masterpwverify')),
		'decrypted does not match new password');
	t.is(decryptedPw, hash(pad(userpw, 'masterpwverify')),
		'decrypte password is the same as the old one')
	
	const dbDecryptedResetKey = decrypt(account.reset_key, dbpw);
	if (isErr(t, dbDecryptedResetKey)) return;
	const decryptedResetKey = decrypt(dbDecryptedResetKey, resetKey);
	t.not(decryptedResetKey, ERRS.INVALID_DECRYPT, 'old reset key can still be used');
});
test('cancels if failing on account changes', async t => {
	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const newMasterPassword = genRandomString(25);
	const config = await genUserAndDb(t, {
		resetKey
	});
	const server = await createServer(config, {
		FAIL_ON_ACCOUNT: true
	});
	const { 
		http, 
		uri,
		userpw,
		instance_id, 
		dbpw,
		server_public_key
	} = config;
	uris.push(uri);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/user/reset', {
		instance_id: instance_id.toHexString()
	}, {
		email: DEFAULT_EMAIL,
		reset_key: resetKey,
		newmasterpassword: newMasterPassword
	}));

	server.kill();

	t.false(response.success, 'request failed');
	if (response.success === true) return;
	
	t.is(response.ERR, API_ERRS.SERVER_ERROR, 'threw a server error');

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
	for (const { encrypted } of passwords) {
		const dbDecrypted = decrypt(encrypted, dbpw);
		t.not(dbDecrypted, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (dbDecrypted === ERRS.INVALID_DECRYPT) return;

		const pwDecrypted = decrypt(dbDecrypted, hash(pad(newMasterPassword, 'masterpwdecrypt')));
		t.is(pwDecrypted, ERRS.INVALID_DECRYPT, 'is an invalid decrypt');
	}

	t.not(instances.map((instance) => {
		return decryptWithSalt(instance.twofactor_enabled, dbpw);
	}).length, 0, 'not a single instance has 2FA enabled');

	const decryptedPw = decrypt(account.pw, dbpw);
	if (isErr(t, decryptedPw)) return;

	t.not(decryptedPw, hash(pad(newMasterPassword, 'masterpwverify')),
		'decrypted does not match new password');
	t.is(decryptedPw, hash(pad(userpw, 'masterpwverify')),
		'decrypte password is the same as the old one')
	
	const dbDecryptedResetKey = decrypt(account.reset_key, dbpw);
	if (isErr(t, dbDecryptedResetKey)) return;
	const decryptedResetKey = decrypt(dbDecryptedResetKey, resetKey);
	t.not(decryptedResetKey, ERRS.INVALID_DECRYPT, 'old reset key can still be used');
});