const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { hash, pad, decryptWithPrivateKey, ERRS, encryptWithPublicKey } from '../../../../../../app/lib/crypto';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance } from '../../../../../app/../../../shared/types/db-types';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { genRandomString } from '../../../../../../app/lib/util';
import { API_ERRS } from '../../../../../app/../../../shared/types/api';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function loginTest() {
	parallel('Login', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/instance/login', {
			instance_id: 'string',
			challenge: 'string'
		}, {
			twofactor_token: 'string'
		}, {
			password_hash: 'string'
		}, {});
		it('login token can be generated when 2FA is disabled', async () => {
			const config = await genUserAndDb({
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
			assert.isFalse(data.u2fRequired, 'no further authentication is required');
			if (data.u2fRequired) return;
			const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
			assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
			assert.strictEqual(typeof token, 'string', 'token is a string');

			assert.strictEqual(data.challenge, challenge, 'challenge matches');
		});
		it('fails if 2FA token is wrong/missing and 2FA is enabled', async () => {
			await (async () => {
				//Wrong token
				const config = await genUserAndDb({
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
					instance_id
				} = config;
				uris.push(uri);

				const challenge = genRandomString(25);
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/login', {
					instance_id: instance_id.toHexString(),
					challenge: encryptWithPublicKey(challenge, server_public_key),
					twofactor_token: 'somewrongtoken'
				}, {
					password_hash: hash(pad(userpw, 'masterpwverify'))
				}));

				server.kill();

				assert.isFalse(response.success, 'API call failed');
				if (response.success) {
					return;
				}
				assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS,
					'invalid credentials error is thrown');
			})();
			await (async () => {
				//Missing token
				const config = await genUserAndDb({
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
					instance_id
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

				assert.isFalse(response.success, 'API call failed');
				if (response.success) {
					return;
				}
				assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS,
					'invalid credentials error is thrown');
			})();
		})
		it('login token can be generated when 2FA is enabled', async () => {
			const twofactorSecret = speakeasy.generateSecret({
				name: 'Password Manager'
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: true,
				twofactor_secret: twofactorSecret.base32
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
				challenge: encryptWithPublicKey(challenge, server_public_key),
				twofactor_token: speakeasy.totp({
					secret: twofactorSecret.base32,
					encoding: 'base32'
				})
			}, {
				password_hash: hash(pad(userpw, 'masterpwverify'))
			}));

			server.kill();

			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) {
				return;
			}
			const data = response.data;
			assert.isFalse(data.u2fRequired, 'no further authentication is required');
			if (data.u2fRequired) return;
			const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
			assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
			assert.strictEqual(typeof token, 'string', 'token is a string');

			assert.strictEqual(data.challenge, challenge, 'challenge matches');
		});
		it('fails if instance id is wrong', async () => {
			const config = await genUserAndDb();
			const server = await createServer(config);
			const { http, uri, server_public_key, userpw } = config;
			uris.push(uri);

			const challenge = genRandomString(25);
			await testInvalidCredentials({
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
	});
}