import { captureURIs, genUserAndDb, createServer, getLoginToken, setPasword, doAPIRequest, genURL, doesNotThrow } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance, EncryptedPassword } from '../../../../../app/database/db-types';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { decryptWithPrivateKey, ERRS } from '../../../../../app/lib/crypto';
import { genRandomString } from '../../../../../app/lib/util';
import { API_ERRS } from '../../../../../app/api';
import speakeasy = require('speakeasy');
import mongo = require('mongodb');
import { test } from 'ava';
import url = require('url');

const uris = captureURIs(test);
testParams(test, uris, '/api/password/getmeta', {
	instance_id: 'string'
}, {}, {
	token: 'string',
	count: 'number',
	password_id: 'string',
}, { });
test('can get the password\'s metadata', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true
	});
	const server = await createServer(config);
	const { http, uri, server_public_key, instance_private_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const websites = [genURL(), genURL()]
	const username = genRandomString(20);
	const password = genRandomString(2);
	const notes = [genRandomString(10), genRandomString(10), genRandomString(10)]
	const twofactorEnabled = false;
	const passwordId = await setPasword(t, {
		websites,
		twofactor_enabled: twofactorEnabled,
		username,
		password,
		notes,
	}, token!, config);

	const response = JSON.parse(await doAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/getmeta', {
		instance_id: config.instance_id.toHexString()
	}, {
		count: config.count++,
		token: token!,
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

	for (let i = 0; i < websites.length; i++) {
		const expectedNote = websites[i];
		const actualNote = parsed.websites[i];

		t.truthy(actualNote, 'note exists');
		const hostname = url.parse(expectedNote).hostname || 
			url.parse(expectedNote).host || expectedNote
		t.is(actualNote.host, hostname, 'host names match');
		t.is(actualNote.exact, expectedNote, 'exact urls match');
	}
	t.is(parsed.twofactor_enabled, twofactorEnabled, 'twofactor enabled is the same');
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
		route: '/api/password/getmeta',
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
		route: '/api/password/getmeta',
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
		route: '/api/password/getmeta',
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