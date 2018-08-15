import { hash, pad, decryptWithPrivateKey, ERRS, encryptWithPublicKey } from '../../../../../app/lib/crypto';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance } from '../../../../../app/../../shared/types/db-types';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { genRandomString } from '../../../../../app/lib/util';
import { API_ERRS } from '../../../../../app/../../shared/types/api';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { assert } from 'chai';

const uris = captureURIs(test);
testParams(test, uris, '/api/instance/login', {
	instance_id: 'string',
	challenge: 'string'
}, {}, {
	password_hash: 'string'
}, {});
test('login token can be generated when 2FA is disabled', async () => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		server_public_key, 
		instance_id, 
		instance_private_key
	} = config;
	uris.push(uri);

	const challenge = genRandomString(25);
	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/instance/login', {
		instance_id: instance_id.toHexString(),
		challenge: encryptWithPublicKey(challenge, server_public_key)
	}, {
		password_hash: hash(pad(userpw, 'masterpwverify'))
	}));

	server.kill();

	assert.isTrue(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	const data = response.data;
	assert.isFalse(data.twofactor_required, 'further authentication is not required');
	if (data.twofactor_required === true) {
		return;
	}
	const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
	assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
	assert.strictEqual(typeof token, 'string', 'token is a string');

	assert.strictEqual(data.challenge, challenge, 'challenge matches');
});
test('login token can be generated when 2FA is enabled', async () => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		instance_twofactor_enabled: true,
		twofactor_secret: speakeasy.generateSecret({
			name: 'Password Manager'
		}).base32
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		server_public_key, 
		instance_id, 
		instance_private_key
	} = config;
	uris.push(uri);

	const challenge = genRandomString(25);
	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/instance/login', {
		instance_id: instance_id.toHexString(),
		challenge: encryptWithPublicKey(challenge, server_public_key)
	}, {
		password_hash: hash(pad(userpw, 'masterpwverify'))
	}));

	server.kill();

	assert.isTrue(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	const data = response.data;
	assert.isTrue(data.twofactor_required, 'further authentication is required');
	if (data.twofactor_required === false) {
		return;
	}
	const token = decryptWithPrivateKey(data.twofactor_auth_token, instance_private_key);
	assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
	assert.strictEqual(typeof token, 'string', 'token is a string');

	assert.strictEqual(data.challenge, challenge, 'challenge matches');
});
test('fails if instance id is wrong', async () => {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	const { http, uri, server_public_key, userpw } = config;
	uris.push(uri);

	const challenge = genRandomString(25);
	await testInvalidCredentials(t, {
		route: '/api/instance/login',
		port: http,
		encrypted: {
			password_hash: hash(pad(userpw, 'masterpwverify'))
		},
		unencrypted: {
			instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>,
			challenge: encryptWithPublicKey(challenge, server_public_key)
		},
		server: server,
		publicKey: server_public_key,
		err: API_ERRS.MISSING_PARAMS
	});
});