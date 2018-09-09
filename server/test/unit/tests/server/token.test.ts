const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { encryptWithPublicKey, hash, pad, decryptWithPrivateKey, ERRS, genRSAKeyPair } from '../../../../app/lib/crypto';
import { genUserAndDb, createServer, captureURIs, doServerAPIRequest } from '../../lib/util';
import { API_ERRS } from '../../../app/../../../shared/types/api';
import { DEFAULT_EMAIL } from '../../../../app/lib/constants';
import { genRandomString } from '../../../../app/lib/util';
import { doSingleQuery } from '../../lib/db';
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function tokenTest() {
	parallel('Token', () => {
		const uris = captureURIs();
		it('invalidates all account tokens if an old token is extended', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				instance_id,
				userpw,
				server_public_key,
				instance_private_key
			} = config;
			uris.push(uri);

			//Log in
			const initialToken = await (async () => {
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
				assert.isFalse(data.u2f_required, 'no further authentication is required');
				if (data.u2f_required) return;
				const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(typeof token, 'string', 'token is a string');

				assert.strictEqual(data.challenge, challenge, 'challenge matches');
				return token;
			})();

			//Extend token
			const extendedToken = await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/extend_key', {
					instance_id: instance_id.toHexString(),
				}, {
					count: 0,
					old_token: initialToken!
				}));

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				const data = response.data;
				const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(typeof token, 'string', 'token is a string');
				return token;
			})();

			//Extend token again
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/extend_key', {
					instance_id: instance_id.toHexString(),
				}, {
					count: 1,
					old_token: initialToken!
				}));

				assert.isFalse(response.success, 'API call failed');
				if (response.success) {
					return;
				}
				assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS,
					'invalid credentials error is thrown');
			})();

			//Try to use the extended token
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/logout', {
					instance_id: instance_id.toHexString(),
					token: extendedToken!
				}));

				assert.isFalse(response.success, 'API call failed');
				if (response.success) return;
				assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS,
					'invalid credentials error is thrown');
			})();

			server.kill();
		});
		it('invalidates a token if its count is wrong', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				instance_id,
				userpw,
				server_public_key,
				instance_private_key
			} = config;
			uris.push(uri);

			//Log in
			const initialToken = await (async () => {
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
				assert.isFalse(data.u2f_required, 'no further authentication is required');
				if (data.u2f_required) return;
				const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(typeof token, 'string', 'token is a string');

				assert.strictEqual(data.challenge, challenge, 'challenge matches');
				return token;
			})();

			//Extend token
			const extendedToken = await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/extend_key', {
					instance_id: instance_id.toHexString(),
				}, {
					count: 0,
					old_token: initialToken!
				}));

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				const data = response.data;
				const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(typeof token, 'string', 'token is a string');
				return token;
			})();

			//Use wrong count
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/extend_key', {
					instance_id: instance_id.toHexString(),
				}, {
					count: 0,
					old_token: initialToken!
				}));

				assert.isFalse(response.success, 'API call failed');
				if (response.success) {
					return;
				}
				assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS,
					'invalid credentials error is thrown');
			})();

			//Try to use the token
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/logout', {
					instance_id: instance_id.toHexString(),
					token: extendedToken!
				}));

				assert.isFalse(response.success, 'API call failed');
				if (response.success) return;
				assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS,
					'invalid credentials error is thrown');
			})();

			server.kill();
		});
		it('invalidates a token if the instance id is wrong', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				instance_id,
				userpw,
				server_public_key,
				instance_private_key
			} = config;
			uris.push(uri);

			const { instanceId: secondInstance } = await (async  () => {
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
				
				assert.notStrictEqual(instance_id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
				assert.notStrictEqual(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
				if (instance_id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
					return {};
				}

				const instance = doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance was created and ID is correct');

				assert.strictEqual(typeof server_key, 'string', 'type of serverkey is string');
				return {
					instanceId: instance_id,
					clientPrivateKey: keyPair.privateKey,
					serverPublicKey: server_key
				}
			})();

			//Log in
			const initialToken = await (async () => {
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
				assert.isFalse(data.u2f_required, 'no further authentication is required');
				if (data.u2f_required) return;
				const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(typeof token, 'string', 'token is a string');

				assert.strictEqual(data.challenge, challenge, 'challenge matches');
				return token;
			})();

			//Extend token
			const extendedToken = await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/extend_key', {
					instance_id: instance_id.toHexString()
				}, {
					count: 0,
					old_token: initialToken!
				}));

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				const data = response.data;
				const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(typeof token, 'string', 'token is a string');
				return token;
			})();

			//Use wrong instance id
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/extend_key', {
					instance_id: secondInstance!
				}, {
					count: 1,
					old_token: initialToken!
				}));

				assert.isFalse(response.success, 'API call failed');
				if (response.success) {
					return;
				}
				assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS,
					'invalid credentials error is thrown');
			})();

			//Try to use the token
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/logout', {
					instance_id: instance_id.toHexString(),
					token: extendedToken!
				}));

				assert.isFalse(response.success, 'API call failed');
				if (response.success) return;
				assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS,
					'invalid credentials error is thrown');
			})();

			server.kill();
		});
	});
}