import { captureURIs, genUserAndDb, createServer, getLoginToken, setPasword, doAPIRequest, genURL, doesNotThrow } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance, EncryptedPassword } from '../../../../../app/database/db-types';
import { decryptWithPrivateKey, ERRS, hash, pad } from '../../../../../app/lib/crypto';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { genRandomString } from '../../../../../app/lib/util';
import { API_ERRS } from '../../../../../app/api';
import speakeasy = require('speakeasy');
import mongo = require('mongodb');
import { test } from 'ava';
import url = require('url');

const uris = captureURIs(test);
testParams(test, uris, '/api/password/allmeta', {
	instance_id: 'string'
}, {}, {
	token: 'string',
	password_hash: 'string',
}, { });
test('can get the password\'s metadata', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true
	});
	const server = await createServer(config);
	const { http, uri, server_public_key, instance_private_key, userpw } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const expectedPasswords = [{
		websites: [genURL(), genURL()],
		username: genRandomString(20),
		password: genRandomString(20),
		notes: [genRandomString(10), genRandomString(10), genRandomString(10)],
		twofactorEnabled: false
	}, {
		websites: [genURL(), genURL()],
		username: genRandomString(20),
		password: genRandomString(20),
		notes: [genRandomString(10), genRandomString(10), genRandomString(10)],
		twofactorEnabled: true
	}];
	const passwordIds = [
		await setPasword(t, {
			websites: expectedPasswords[0].websites,
			twofactor_enabled: expectedPasswords[0].twofactorEnabled,
			username: expectedPasswords[0].username,
			password: expectedPasswords[0].password,
			notes: expectedPasswords[0].notes
		}, token!, config), 
		await setPasword(t, {
			websites: expectedPasswords[1].websites,
			twofactor_enabled: expectedPasswords[1].twofactorEnabled,
			username: expectedPasswords[1].username,
			password: expectedPasswords[1].password,
			notes: expectedPasswords[1].notes
		}, token!, config)
	];

	const response = JSON.parse(await doAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/allmeta', {
		instance_id: config.instance_id.toHexString()
	}, {
		token: token!,
		password_hash: hash(pad(userpw, 'masterpwverify'))
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
	t.is(parsed.length, expectedPasswords.length, 'exactly 2 passwords are returned');
	for (let i = 0; i < expectedPasswords.length; i++) {
		const parsedValue = parsed[i];
		const expected = expectedPasswords[i];
		t.is(parsedValue.id, passwordIds[i], 'password IDs are the same');
		for (let i = 0; i < expected.websites.length; i++) {
			const expectedNote = expected.websites[i];
			const actualNote = parsedValue.websites[i];
	
			t.truthy(actualNote, 'note exists');
			const hostname = url.parse(expectedNote).hostname || 
				url.parse(expectedNote).host || expectedNote
			t.is(actualNote.host, hostname, 'host names match');
			t.is(actualNote.exact, expectedNote, 'exact urls match');
		}
		t.is(parsedValue.twofactor_enabled, expected.twofactorEnabled, 'twofactor enabled is the same');
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
	const { http, uri, server_public_key, userpw } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);
	await testInvalidCredentials(t, {
		route: '/api/password/allmeta',
		port: http,
		unencrypted: {
			instance_id: config.instance_id.toHexString()
		},
		encrypted: {
			token: 'wrongtoken',
			password_hash: hash(pad(userpw, 'masterpwverify'))
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
	const { http, uri, server_public_key, userpw } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);
	await testInvalidCredentials(t, {
		route: '/api/password/allmeta',
		port: http,
		unencrypted: {
			instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
		},
		encrypted: {
			token: token!,
			password_hash: hash(pad(userpw, 'masterpwverify'))
		},
		server: server,
		publicKey: server_public_key,
		err: API_ERRS.MISSING_PARAMS
	});
});
test('fails if password is wrong', async t => {
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
	await testInvalidCredentials(t, {
		route: '/api/password/allmeta',
		port: http,
		unencrypted: {
			instance_id: config.instance_id.toHexString()
		},
		encrypted: {
			token: token!,
			password_hash: hash(pad('wrongpassword', 'masterpwverify'))
		},
		server: server,
		publicKey: server_public_key
	});
});