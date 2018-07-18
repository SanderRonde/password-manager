import { hash, pad, decryptWithPrivateKey, ERRS, encryptWithPublicKey } from '../../../../../app/lib/crypto';
import { captureURIs, genUserAndDb, createServer, doAPIRequest, testParams } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance } from '../../../../../app/database/db-types';
import { genRandomString } from '../../../../../app/lib/util';
import speakeasy = require('speakeasy');
import mongo = require('mongodb');
import { test } from 'ava';
import { API_ERRS } from '../../../../../app/api';

const uris = captureURIs(test);
testParams(test, uris, '/api/instance/login', {
	instance_id: 'string',
	challenge: 'string',
	password_hash: 'string'
}, {}, {}, {});
test('login token can be generated when 2FA is disabled', async t => {
	const config = await genUserAndDb(t, {
		twofactor_enabled: false
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
	const response = JSON.parse(await doAPIRequest({ port: http }, '/api/instance/login', {
		instance_id: instance_id.toHexString(),
		challenge: encryptWithPublicKey(challenge, server_public_key),
		password_hash: hash(pad(userpw, 'masterpwverify'))
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	const data = response.data;
	t.false(data.twofactor_required, 'further authentication is not required');
	if (data.twofactor_required === true) {
		return;
	}
	const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
	t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
	t.is(typeof token, 'string', 'token is a string');

	t.is(data.challenge, challenge, 'challenge matches');
});
test('login token can be generated when 2FA is enabled', async t => {
	const config = await genUserAndDb(t, {
		twofactor_enabled: true,
		twofactor_token: speakeasy.generateSecret({
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
	const response = JSON.parse(await doAPIRequest({ port: http }, '/api/instance/login', {
		instance_id: instance_id.toHexString(),
		challenge: encryptWithPublicKey(challenge, server_public_key),
		password_hash: hash(pad(userpw, 'masterpwverify'))
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	const data = response.data;
	t.true(data.twofactor_required, 'further authentication is required');
	if (data.twofactor_required === false) {
		return;
	}
	const token = decryptWithPrivateKey(data.twofactor_auth_token, instance_private_key);
	t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
	t.is(typeof token, 'string', 'token is a string');

	t.is(data.challenge, challenge, 'challenge matches');
});
test('fails if instance id is wrong', async t => {
	const config = await genUserAndDb(t, {
		twofactor_enabled: false
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		server_public_key
	} = config;
	uris.push(uri);

	const challenge = genRandomString(25);
	const response = JSON.parse(await doAPIRequest({ port: http }, '/api/instance/login', {
		instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>,
		challenge: encryptWithPublicKey(challenge, server_public_key),
		password_hash: hash(pad(userpw, 'masterpwverify'))
	}));

	server.kill();

	t.false(response.success, 'API call failed');
	if (response.success === true) {
		return;
	}
	t.is(response.ERR, API_ERRS.INVALID_CREDENTIALS,
		'invalid credentials error is returned');
});