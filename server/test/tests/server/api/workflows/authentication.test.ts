import { genRSAKeyPair, hash, pad, decryptWithPrivateKey, ERRS, encryptWithPublicKey } from '../../../../../app/lib/crypto';
import { genUserAndDb, createServer, captureURIs, doServerAPIRequest } from '../../../../lib/util';
import { DEFAULT_EMAIL } from '../../../../../app/lib/constants';
import { genRandomString } from '../../../../../app/lib/util';
import { doSingleQuery } from '../../../../lib/db';
import * as mongo from 'mongodb'
import { assert } from 'chai';

const uris = captureURIs(test);
test('can log in after registering instance', async t => {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
	} = config;
	uris.push(uri);

	const {
		instance_id, clientPrivateKey, serverPublicKey
	} = await (async  () => {
		const keyPair = genRSAKeyPair();
		const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/register', {
			email: DEFAULT_EMAIL,
			password: hash(pad(userpw, 'masterpwverify')),
			public_key: keyPair.publicKey
		}));

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return {};
		}
		const instance_id = decryptWithPrivateKey(response.data.id, keyPair.privateKey);
		const server_key = decryptWithPrivateKey(response.data.server_key, 
			keyPair.privateKey)
		
		t.not(instance_id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		t.not(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		if (instance_id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
			return {};
		}

		const instance = await doSingleQuery(uri, async (db) => {
			return await db.collection('instances').findOne({
				_id: new mongo.ObjectId(instance_id)
			});
		});
		t.truthy(instance, 'instance was created and ID is correct');

		t.is(typeof server_key, 'string', 'type of serverkey is string');
		return {
			instance_id: instance_id,
			clientPrivateKey: keyPair.privateKey,
			serverPublicKey: server_key
		}
	})();
	await (async () => {
		const challenge = genRandomString(25);
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: serverPublicKey!
		}, '/api/instance/login', {
			instance_id: instance_id!,
			challenge: encryptWithPublicKey(challenge, serverPublicKey!)
		}, {
			password_hash: hash(pad(userpw, 'masterpwverify'))
		}));

		server.kill();

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.false(data.twofactor_required, 'further authentication is not required');
		if (data.twofactor_required === true) {
			return;
		}
		const token = decryptWithPrivateKey(data.auth_token, clientPrivateKey!);
		t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		t.is(typeof token, 'string', 'token is a string');

		t.is(data.challenge, challenge, 'challenge matches');
	})();
});
test('can log out after logging in', async t => {
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

	const token = await (async () => {	
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
		
		assert.isTrue(response.success, 'API call succeeded');
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
		if (token === ERRS.INVALID_DECRYPT) {
			return;
		}
		t.is(typeof token, 'string', 'token is a string');
	
		t.is(data.challenge, challenge, 'challenge matches');
		return token;
	})();
	await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/logout', {
			instance_id: instance_id.toHexString(),
			token: token!
		}));
	
		server.kill();
	
		assert.isTrue(response.success, 'API call succeeded')
	})();
});
test('can log in and extend key', async t => {
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

	const token = await (async () => {	
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
		
		assert.isTrue(response.success, 'API call succeeded');
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
		if (token === ERRS.INVALID_DECRYPT) {
			return;
		}
		t.is(typeof token, 'string', 'token is a string');
	
		t.is(data.challenge, challenge, 'challenge matches');
		return token;
	})();
	await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/extend_key', {
			instance_id: instance_id.toHexString(),
			count: config.count++,
			oldToken: token!
		}));
	
		server.kill();
	
		assert.isTrue(response.success, 'API call succeeded')
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.is(typeof data.auth_token, 'string', 'auth token was passed');
	})();
});
test('can register an instance, log in, extend key and log out', async t => {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
	} = config;
	uris.push(uri);

	const { instanceId, clientPrivateKey, serverPublicKey } = await (async  () => {
		const keyPair = genRSAKeyPair();
		const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/register', {
			email: DEFAULT_EMAIL,
			password: hash(pad(userpw, 'masterpwverify')),
			public_key: keyPair.publicKey
		}));

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return {};
		}
		const instance_id = decryptWithPrivateKey(response.data.id, keyPair.privateKey);
		const server_key = decryptWithPrivateKey(response.data.server_key, 
			keyPair.privateKey)
		
		t.not(instance_id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		t.not(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		if (instance_id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
			return {};
		}

		const instance = doSingleQuery(uri, async (db) => {
			return await db.collection('instances').findOne({
				_id: new mongo.ObjectId(instance_id)
			});
		});
		t.truthy(instance, 'instance was created and ID is correct');

		t.is(typeof server_key, 'string', 'type of serverkey is string');
		return {
			instanceId: instance_id,
			clientPrivateKey: keyPair.privateKey,
			serverPublicKey: server_key
		}
	})();
	const token = await (async () => {
		const challenge = genRandomString(25);
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: serverPublicKey!
		}, '/api/instance/login', {
			instance_id: instanceId!,
			challenge: encryptWithPublicKey(challenge, serverPublicKey!)
		}, {
			password_hash: hash(pad(userpw, 'masterpwverify'))
		}));

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.false(data.twofactor_required, 'further authentication is not required');
		if (data.twofactor_required === true) {
			return;
		}
		const token = decryptWithPrivateKey(data.auth_token, clientPrivateKey!);
		t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (token === ERRS.INVALID_DECRYPT) {
			return;
		}
		t.is(typeof token, 'string', 'token is a string');

		t.is(data.challenge, challenge, 'challenge matches');
		return token;
	})();
	const newToken = await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/extend_key', {
			instance_id: instanceId!,
			count: config.count++,
			oldToken: token!
		}));
	
		assert.isTrue(response.success, 'API call succeeded')
		if (!response.success) {
			return;
		}
		t.is(typeof response.data.auth_token, 'string', 'auth token was passed');
		const decrypted = decryptWithPrivateKey(response.data.auth_token, clientPrivateKey!);
		t.not(decrypted, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		if (decrypted === ERRS.INVALID_DECRYPT) {
			return;
		}
		return decrypted;
	})();
	await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/logout', {
			instance_id: instanceId!,
			token: newToken!
		}));
	
		server.kill();
	
		assert.isTrue(response.success, 'API call succeeded')
	})();
});