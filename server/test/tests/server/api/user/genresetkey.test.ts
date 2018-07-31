import { EncryptedAccount, MongoRecord, EncryptedInstance, StringifiedObjectId } from '../../../../../app/database/db-types';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest } from '../../../../lib/util';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { RESET_KEY_LENGTH } from '../../../../../app/lib/constants';
import { genRandomString } from '../../../../../app/lib/util';
import { decrypt, ERRS } from '../../../../../app/lib/crypto';
import { API_ERRS } from '../../../../../app/api';
import { getDB } from '../../../../lib/db';
import * as mongo from 'mongodb'
import { test } from 'ava';

const uris = captureURIs(test);
testParams(test, uris, '/api/user/genresetkey', {
	instance_id: 'string',
}, {}, {
	reset_key: 'string',
	master_password: 'string'
}, {});
test('fails if instance id is wrong', async t => {
	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const config = await genUserAndDb(t, {
		resetKey
	});
	const server = await createServer(config);
	const { 
		http, 
		uri, 
		server_public_key
	} = config;
	uris.push(uri);

	await testInvalidCredentials(t, {
		route: '/api/user/genresetkey',
		port: http,
		unencrypted: {
			instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
		},
		encrypted: {
			reset_key: resetKey,
			master_password: 'masterpassword'
		},
		server: server,
		publicKey: server_public_key,
		err: API_ERRS.MISSING_PARAMS
	});
});
test('rejects if password is wrong', async t => {
	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const config = await genUserAndDb(t, {
		resetKey
	});
	const server = await createServer(config);
	const { 
		http, 
		uri, 
		server_public_key,
		instance_id
	} = config;
	uris.push(uri);

	await testInvalidCredentials(t, {
		route: '/api/user/genresetkey',
		port: http,
		unencrypted: {
			instance_id: instance_id.toHexString()
		},
		encrypted: {
			reset_key: resetKey,
			master_password: 'wrongpassword'
		},
		server: server,
		publicKey: server_public_key
	});
});
test('rejects if reset key is wrong', async t => {
	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const config = await genUserAndDb(t, {
		resetKey
	});
	const server = await createServer(config);
	const { 
		http, 
		uri, 
		server_public_key,
		instance_id,
		userpw
	} = config;
	uris.push(uri);

	await testInvalidCredentials(t, {
		route: '/api/user/genresetkey',
		port: http,
		unencrypted: {
			instance_id: instance_id.toHexString()
		},
		encrypted: {
			reset_key: genRandomString(RESET_KEY_LENGTH),
			master_password: userpw
		},
		server: server,
		publicKey: server_public_key
	});
});
test('works if params are correct', async t => {
	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const config = await genUserAndDb(t, {
		resetKey
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

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/user/genresetkey', {
		instance_id: instance_id.toHexString()
	}, {
		reset_key: resetKey,
		master_password: userpw
	}));

	server.kill();

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
});