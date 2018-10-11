const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { genRSAKeyPair, hash, pad, decryptWithPrivateKey, ERRS, decryptWithSalt, encryptWithPublicKey } from '../../../../../../app/lib/crypto';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest } from '../../../../lib/util';
import { genRandomString } from '../../../../../../app/lib/util';
import { DEFAULT_EMAIL } from '../../../../../../app/lib/constants';
import { doSingleQuery } from '../../../../lib/db';
import * as querystring from 'querystring'
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { assert } from 'chai';
import * as url from 'url'

export function instanceTwofactorTest() {
	parallel('Instance Twofactor', () => {
		const uris = captureURIs();
		it('can enable 2FA after registering instance when 2FA is enabled for the user', async () => {
			const twofactor = speakeasy.generateSecret({
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: twofactor.ascii
			});
			const server = await createServer(config);
			const { 
				http, 
				userpw, 
				uri, 
				dbpw
			} = config;
			uris.push(uri);

			const {
				instance_id,
				server_key
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
				
				assert.notStrictEqual(instance_id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
				assert.notStrictEqual(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
				if (instance_id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
					return {};
				}

				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance was created and ID is correct');

				assert.strictEqual(typeof server_key, 'string', 'type of serverkey is string');
				return {
					instance_id: instance_id,
					server_key: server_key
				}
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_key!
				}, '/api/instance/2fa/enable', {
					instance_id: instance_id!
				}, {
					password: hash(pad(userpw, 'masterpwverify')),
				}));
			
				server.kill();
			
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
			assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					enabled: false;
					verify_2fa_required: true;
					auth_url: string;
				} | {
					enabled: true;
				};
				assert.isTrue(finalData.enabled, '2FA was already enabled');
			
				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, true, '2FA is now enabled');
			})();
		});
		it('can enable 2FA and then disable it', async () => {
			const twofactor = speakeasy.generateSecret({
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: false,
				twofactor_secret: twofactor.ascii
			});
			const server = await createServer(config);
			const { 
				http, 
				userpw, 
				uri, 
				dbpw,
				instance_id, 
				server_public_key
			} = config;
			uris.push(uri);

			await (async () => {	
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/2fa/enable', {
					instance_id: instance_id.toHexString()
				}, {
					password: hash(pad(userpw, 'masterpwverify'))
				}));
				
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
			assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					enabled: false;
					verify_2fa_required: true;
					auth_url: string;
				} | {
					enabled: true;
				};
				assert.isTrue(finalData.enabled, '2FA was already enabled');
			
				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, true, '2FA is now enabled');
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/2fa/disable', {
					instance_id: instance_id.toHexString(),
					twofactor_token: speakeasy.totp({
						secret: twofactor.ascii
					})
				}, {
					password: hash(pad(userpw, 'masterpwverify'))
				}));

				server.kill();

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
			assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					disabled: true;	
				};
				assert.isTrue(finalData.disabled, '2FA was disabled');

				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, false, '2FA is now disabled');
			})();
		});
		it('can enable 2FA, disable 2FA and then enable it', async () => {
			const twofactor = speakeasy.generateSecret({
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: false,
				twofactor_secret: twofactor.ascii
			});
			const server = await createServer(config);
			const { 
				http, 
				userpw, 
				uri, 
				dbpw,
				instance_id, 
				server_public_key
			} = config;
			uris.push(uri);

			await (async () => {	
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/2fa/enable', {
					instance_id: instance_id.toHexString()
				}, {
					password: hash(pad(userpw, 'masterpwverify'))
				}));
				
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
			assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					enabled: false;
					verify_2fa_required: true;
					auth_url: string;
				} | {
					enabled: true;
				};
				assert.isTrue(finalData.enabled, '2FA was already enabled');
			
				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, true, '2FA is now enabled');
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/2fa/disable', {
					instance_id: instance_id.toHexString(),
					twofactor_token: speakeasy.totp({
						secret: twofactor.ascii
					})
				}, {
					password: hash(pad(userpw, 'masterpwverify'))
				}));

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
			assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					disabled: true;	
				};
				assert.isTrue(finalData.disabled, '2FA was disabled');

				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, false, '2FA is now disabled');
			})();
			await (async () => {	
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/2fa/enable', {
					instance_id: instance_id.toHexString()
				}, {
					password: hash(pad(userpw, 'masterpwverify'))
				}));

				server.kill();
				
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
			assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					enabled: false;
					verify_2fa_required: true;
					auth_url: string;
				} | {
					enabled: true;
				};
				assert.isTrue(finalData.enabled, '2FA was already enabled');
			
				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, true, '2FA is now enabled');
			})();
		});
		it('can verify a login requiring 2FA', async () => {
			const twofactor = speakeasy.generateSecret({
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: true,
				twofactor_secret: twofactor.ascii
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

			const { token: authToken, count } = await (async () => {	
				const challenge = genRandomString(25);
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/login', {
					instance_id: instance_id.toHexString(),
					challenge: encryptWithPublicKey(challenge, server_public_key),
					twofactor_token: speakeasy.totp({
						secret: twofactor.ascii
					})
				}, {
					password_hash: hash(pad(userpw, 'masterpwverify'))
				}));
				
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return {
						token: null, count: null
					};
				}
				const data = response.data;
				assert.isFalse(data.u2f_required, 'no further authentication is required');
				if (data.u2f_required) return {
					token: null, count: null
				};
				const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
				const count = decryptWithPrivateKey(data.count, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT) {
					return {
						token: null,
						count: null
					};
				}
				assert.notStrictEqual(count, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (count === ERRS.INVALID_DECRYPT) {
					return {
						token: null,
						count: null
					};
				}
				assert.strictEqual(typeof token, 'string', 'token is a string');
				assert.strictEqual(typeof count, 'number', 'type of count is number');
				return {
					token, count
				};
			})();
			//Check if it's valid by extending the key
			await (async () => {	
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/instance/extend_key', {
					instance_id: instance_id.toHexString()
				}, {
					old_token: authToken!,
					count: count!
				}));
			
				server.kill();
			
				assert.isTrue(response.success, 'API call succeeded')
				if (!response.success) {
					return;
				}
				const data = response.data;
				assert.strictEqual(typeof data.auth_token, 'string', 'new auth token was passed');
			})();
		});
		it('can register an instance, enable 2FA, log in with it and disable 2FA', async () => {
			const twofactor = speakeasy.generateSecret({
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: twofactor.ascii
			});
			const server = await createServer(config);
			const { 
				http, 
				userpw, 
				uri, 
				dbpw
			} = config;
			uris.push(uri);

			const {
				instance_id,
				server_public_key,
				instance_private_key
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
				
				assert.notStrictEqual(instance_id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
				assert.notStrictEqual(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
				if (instance_id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
					return {};
				}

				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance was created and ID is correct');

				assert.strictEqual(typeof server_key, 'string', 'type of serverkey is string');
				return {
					instance_id: instance_id,
					server_public_key: server_key,
					instance_private_key: keyPair.privateKey
				}
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key!
				}, '/api/instance/2fa/enable', {
					instance_id: instance_id!
				}, {
					password: hash(pad(userpw, 'masterpwverify'))
				}));
				
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
				assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					enabled: false;
					verify_2fa_required: true;
					auth_url: string;
				} | {
					enabled: true;
				};
				assert.isTrue(finalData.enabled, '2FA was already enabled');
			
				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, true, '2FA is now enabled');
			})();
			const { token: authToken, count } = await (async () => {	
				const challenge = genRandomString(25);
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key!
				}, '/api/instance/login', {
					instance_id: instance_id!,
					challenge: encryptWithPublicKey(challenge, server_public_key!),
					twofactor_token: speakeasy.totp({
						secret: twofactor.ascii
					})
				}, {
					password_hash: hash(pad(userpw, 'masterpwverify'))
				}));
				
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return {
						token: null, count: null
					};
				}
				const data = response.data;
				assert.isFalse(data.u2f_required, 'no further authentication is required');
				if (data.u2f_required) return {
					token: null, count: null
				};
				const token = decryptWithPrivateKey(data.auth_token, instance_private_key!);
				const count = decryptWithPrivateKey(data.count, instance_private_key!);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT) {
					return {
						token: null,
						count: null
					};
				}
				assert.notStrictEqual(count, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (count === ERRS.INVALID_DECRYPT) {
					return {
						token: null,
						count: null
					};
				}
				assert.strictEqual(typeof token, 'string', 'token is a string');
				assert.strictEqual(typeof count, 'number', 'type of count is number');
				return {
					token, count
				};
			})();
			//Check if it's valid by extending the key
			await (async () => {	
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key!
				}, '/api/instance/extend_key', {
					instance_id: instance_id!
				}, {
					old_token: authToken!,
					count: count!
				}));
				
				assert.isTrue(response.success, 'API call succeeded')
				if (!response.success) {
					return;
				}
				const data = response.data;
				assert.strictEqual(typeof data.auth_token, 'string', 'new auth token was passed');
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key!
				}, '/api/instance/2fa/disable', {
					instance_id: instance_id!,
					twofactor_token: speakeasy.totp({
						secret: twofactor.ascii
					})
				}, {
					password: hash(pad(userpw, 'masterpwverify'))
				}));

				server.kill();

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
				assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					disabled: true;	
				};
				assert.isTrue(finalData.disabled, '2FA was disabled');

				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, false, '2FA is now disabled');
			})();
		});

		it('can register an instance, enable 2FA for the user and enable 2FA for the instance', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer(config);
			const { 
				http, 
				userpw, 
				uri, 
				dbpw
			} = config;
			uris.push(uri);

			const {
				instance_id,
				server_public_key,
				instance_private_key
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
				
				assert.notStrictEqual(instance_id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
				assert.notStrictEqual(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
				if (instance_id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
					return {};
				}

				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance was created and ID is correct');

				assert.strictEqual(typeof server_key, 'string', 'type of serverkey is string');
				return {
					instance_id: instance_id,
					server_public_key: server_key,
					instance_private_key: keyPair.privateKey
				}
			})();
			const secret = await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key!
				}, '/api/instance/2fa/enable', {
					instance_id: instance_id!
				}, {
					password: hash(pad(userpw, 'masterpwverify'))
				}));
				
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
			assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					enabled: false;
					verify_2fa_required: true;
					auth_url: string;
				} | {
					enabled: true;
				};
				assert.isFalse(finalData.enabled, '2FA was not enabled yet');
				if (finalData.enabled) return;
				const { query } = url.parse(finalData.auth_url);
				const secret = querystring.parse(query!).secret;

				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, false, '2FA is still disabled');

				return secret as string;
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ port: http}, '/api/instance/2fa/confirm', {
					instance_id: instance_id!,
					twofactor_token: speakeasy.totp({
						secret: secret!
					})
				}));

				assert.isTrue(response.success, 'API request succeeded');

				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, true, '2FA is now enabled');
			})();
			const { token: authToken, count } = await (async () => {
				const challenge = genRandomString(25);
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key!
				}, '/api/instance/login', {
					instance_id: instance_id!,
					challenge: encryptWithPublicKey(challenge, server_public_key!),
					twofactor_token: speakeasy.totp({
						secret: secret
					})
				}, {
					password_hash: hash(pad(userpw, 'masterpwverify'))
				}));
				
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return {
						token: null, count: null
					};
				}
				const data = response.data;
				assert.isFalse(data.u2f_required, 'no further authentication is required');
				if (data.u2f_required) return {
					token: null, count: null
				};
				const token = decryptWithPrivateKey(data.auth_token, instance_private_key!);
				const count = decryptWithPrivateKey(data.count, instance_private_key!);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT) {
					return {
						token: null,
						count: null
					};
				}
				assert.notStrictEqual(count, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (count === ERRS.INVALID_DECRYPT) {
					return {
						token: null,
						count: null
					};
				}
				assert.strictEqual(typeof token, 'string', 'token is a string');
				assert.strictEqual(typeof count, 'number', 'type of count is number');
				return {
					token, count
				};
			})();
			//Check if it's valid by extending the key
			await (async () => {	
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key!
				}, '/api/instance/extend_key', {
					instance_id: instance_id!
				}, {
					old_token: authToken!,
					count: count!
				}));
				
				assert.isTrue(response.success, 'API call succeeded')
				if (!response.success) {
					return;
				}
				const data = response.data;
				assert.strictEqual(typeof data.auth_token, 'string', 'new auth token was passed');
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key!
				}, '/api/instance/2fa/disable', {
					instance_id: instance_id!,
					twofactor_token: speakeasy.totp({
						secret: secret
					})
				}, {
					password: hash(pad(userpw, 'masterpwverify'))
				}));

				server.kill();

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) return;
				const data = response.data;
			assert.isFalse(!!(data as {
					message: 'state unchanged (was already set)'
				}).message, 'state is not unchanged');
				if ((data as {
					message: 'state unchanged (was already set)'
				}).message) {
					return;
				}
				const finalData = data as {
					disabled: true;	
				};
				assert.isTrue(finalData.disabled, '2FA was disabled');

				const instance = await doSingleQuery(uri, async (db) => {
					return await db.collection('instances').findOne({
						_id: new mongo.ObjectId(instance_id)
					});
				});
				assert.isTrue(!!instance, 'instance exists');
				if (!instance) return;
				const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
				assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decrypt === ERRS.INVALID_DECRYPT) return;
				assert.strictEqual(decrypt, false, '2FA is now disabled');
			})();
		});
	});
}