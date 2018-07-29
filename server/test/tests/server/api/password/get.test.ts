import { captureURIs, genUserAndDb, createServer, getLoginToken, setPasword, doServerAPIRequest, genURL, doesNotThrow, isErr } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance, EncryptedPassword } from '../../../../../app/database/db-types';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { decryptWithPrivateKey, ERRS, decrypt, hash, pad } from '../../../../../app/lib/crypto';
import { genRandomString } from '../../../../../app/lib/util';
import { API_ERRS } from '../../../../../app/api';
import speakeasy = require('speakeasy');
import mongo = require('mongodb');
import { test } from 'ava';

const uris = captureURIs(test);
testParams(test, uris, '/api/password/get', {
	instance_id: 'string'
}, {}, {
	token: 'string',
	count: 'number',
	password_id: 'string',
}, {
	twofactor_token: 'string'
});
test('can get the password if 2FA is disabled', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true
	});
	const server = await createServer(config);
	const { http, uri, server_public_key, instance_private_key, userpw } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const websites = [genURL(), genURL()]
	const username = genRandomString(20);
	const password = genRandomString(2);
	const notes = [genRandomString(10), genRandomString(10), genRandomString(10)]
	const passwordId = await setPasword(t, {
		websites,
		twofactor_enabled: false,
		username,
		password,
		notes,
	}, token!, config);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/get', {
		instance_id: config.instance_id.toHexString()
	}, {
		token: token!,
		count: config.count++,
		password_id: passwordId!
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	const data = response.data;
	const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
	t.not(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	if (decryptedData === ERRS.INVALID_DECRYPT) return;

	const parsed = doesNotThrow(t, () => {
		return JSON.parse(decryptedData);
	}, 'data can be parsed');
	t.is(parsed.id, passwordId, 'password IDs are the same');

	const decryptedEncrypted = decrypt(parsed.encrypted, 
		hash(pad(userpw, 'masterpwdecrypt')));
	if (isErr(t, decryptedEncrypted)) return;

	t.is(decryptedEncrypted.username, username, 'username is the same');
	t.is(decryptedEncrypted.password, password, 'password is the same');
	for (let i = 0; i < notes.length; i++) {
		const expectedNote = notes[i];
		const actualNote = decryptedEncrypted.notes[i];

		t.truthy(actualNote, 'note exists');
		t.is(actualNote, expectedNote, 'notes are the same');
	}
});
test('fails if 2FA is enabled but no 2FA token is passed', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const passwordId = await setPasword(t, {
		websites: [],
		twofactor_enabled: true,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/get', {
		instance_id: config.instance_id.toHexString()
	}, {
		token: token!,
		count: config.count++,
		password_id: passwordId!
	}));

	server.kill();

	t.false(response.success, 'API call failed');
	if (response.success) {
		return;
	}
	t.is(response.ERR, API_ERRS.INVALID_CREDENTIALS,
		'invalid credentials error was thrown');
});
test('can get the password if 2FA is enabled', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key, instance_private_key, userpw } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const websites = [genURL(), genURL()]
	const username = genRandomString(20);
	const password = genRandomString(2);
	const notes = [genRandomString(10), genRandomString(10), genRandomString(10)]
	const passwordId = await setPasword(t, {
		websites,
		twofactor_enabled: false,
		username,
		password,
		notes,
	}, token!, config);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/get', {
		instance_id: config.instance_id.toHexString()
	}, {
		token: token!,
		count: config.count++,
		password_id: passwordId!,
		twofactor_token: speakeasy.totp({
			secret: secret.base32,
			encoding: 'base32'
		})
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	
	const data = response.data;
	const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
	t.not(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	if (decryptedData === ERRS.INVALID_DECRYPT) return;

	const parsed = doesNotThrow(t, () => {
		return JSON.parse(decryptedData);
	}, 'data can be parsed');
	t.is(parsed.id, passwordId, 'password IDs are the same');

	const decryptedEncrypted = decrypt(parsed.encrypted, 
		hash(pad(userpw, 'masterpwdecrypt')));
	if (isErr(t, decryptedEncrypted)) return;

	t.is(decryptedEncrypted.username, username, 'username is the same');
	t.is(decryptedEncrypted.password, password, 'password is the same');
	for (let i = 0; i < notes.length; i++) {
		const expectedNote = notes[i];
		const actualNote = decryptedEncrypted.notes[i];

		t.truthy(actualNote, 'note exists');
		t.is(actualNote, expectedNote, 'notes are the same');
	}
});
test('fails if auth token is wrong', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);
	const passwordId = await setPasword(t, {
		websites: [],
		twofactor_enabled: false,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	await testInvalidCredentials(t, {
		route: '/api/password/get',
		port: http,
		unencrypted: {
			instance_id: config.instance_id.toHexString()
		},
		encrypted: {
			count: config.count++,
			token: 'wrongtoken',
			password_id: passwordId!
		},
		server: server,
		publicKey: server_public_key
	});
});
test('fails if instance id is wrong', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);
	const passwordId = await setPasword(t, {
		websites: [],
		twofactor_enabled: false,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	await testInvalidCredentials(t, {
		route: '/api/password/get',
		port: http,
		unencrypted: {
			instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
		},
		encrypted: {
			count: config.count++,
			token: token!,
			password_id: passwordId!
		},
		server: server,
		publicKey: server_public_key,
		err: API_ERRS.MISSING_PARAMS
	});
});
test('fails if password id is wrong', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);
	await setPasword(t, {
		websites: [],
		twofactor_enabled: false,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	await testInvalidCredentials(t, {
		route: '/api/password/get',
		port: http,
		unencrypted: {
			instance_id: config.instance_id.toHexString()
		},
		encrypted: {
			count: config.count++,
			token: token!,
			password_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedPassword>
		},
		server: server,
		publicKey: server_public_key
	});
});