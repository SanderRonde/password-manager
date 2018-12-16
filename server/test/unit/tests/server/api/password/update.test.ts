const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { MongoRecord, EncryptedPassword, EncryptedInstance, StringifiedObjectId } from '../../../../../app/../../../shared/types/db-types';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest, getLoginToken, genURL, setPasword } from '../../../../lib/util';
import { encrypt, hash, pad, decryptWithSalt, ERRS, decrypt, Encrypted, Hashed, Padded } from '../../../../../../app/lib/crypto';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { ENCRYPTION_ALGORITHM } from '../../../../../../app/lib/constants';
import { API_ERRS } from '../../../../../app/../../../shared/types/api';
import { genRandomString } from '../../../../../../app/lib/util';
import { getDB } from '../../../../lib/db';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import * as url from 'url'
import { assert } from 'chai';

export function passwordUpdateTest() {
	parallel('Update', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/password/update', {
			instance_id: 'string'
		}, {}, {
			token: 'string',
			count: 'number',
			password_id: 'string',
		}, {
			addedWebsites: 'array',
			removedWebsites: 'array',
			twofactor_enabled: 'boolean',
			encrypted: 'string',
			twofactor_token: 'string',
			username: 'string'
		});
		it('password can be updated', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true
			});
			const server = await createServer(config);
			const { http, uri, server_public_key, userpw, instance_id, dbpw } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;

			const passwordId = await setPasword({
				websites: [],
				twofactor_enabled: false,
				username: 'username',
				password: 'password',
				notes: []		
			}, token, count++, config);

			const expectedWebsites = [genURL(), genURL(), genURL()];
			const expected2FAEnabled = Math.random() > 0.5;
			const expectedEncrypted = encrypt({
				twofactor_secret: null,
				password: genRandomString(25),
				notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
			}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
			const expectedUsername = genRandomString(25);
			
			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/update', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: token!,
				count: count++,
				password_id: passwordId!,
				addedWebsites: expectedWebsites.map((website) => {
					return {
						url: website,
						favicon: null
					}
				}),
				username: expectedUsername,
				twofactor_enabled: expected2FAEnabled,
				encrypted: expectedEncrypted
			}));

			server.kill();

			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) {
				return;
			}
			
			//Check if it was actually created
			const { db, done } = await getDB(uri);
			const password = await db.collection('passwords').findOne({
				_id: new mongo.ObjectId(passwordId!)
			}) as MongoRecord<EncryptedPassword>;
			assert.notStrictEqual(password, null, 'record was found');

			const instance = await db.collection('instances').findOne({
				_id: instance_id
			}) as MongoRecord<EncryptedInstance>;
			assert.notStrictEqual(instance, null, 'instance was found');
			done();

			assert.strictEqual(password.user_id.toHexString(), instance.user_id.toHexString(),
				'user ids match');
			const decryptedTwofactorEnabled = decryptWithSalt(password.twofactor_enabled,
				dbpw);
			assert.notStrictEqual(decryptedTwofactorEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			assert.strictEqual(decryptedTwofactorEnabled, expected2FAEnabled, 'twofactor enabled is the same');

			const actualWebsites = password.websites.map(({ exact, host }) => {
				return {
					host: decrypt(host, dbpw),
					exact: decrypt(exact, dbpw)
				}
			});
			for (const { host, exact } of actualWebsites) {
				assert.notStrictEqual(host, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				assert.notStrictEqual(exact, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			}

			for (let i = 0; i < expectedWebsites.length; i++) {
				const expectedWebsite = expectedWebsites[i];
				const actualWebsite = actualWebsites[i];

				const host = url.parse(expectedWebsite).hostname ||
					url.parse(expectedWebsite).host || expectedWebsite;
				assert.isTrue(!!actualWebsite, 'a website exists at given index');
				assert.strictEqual(actualWebsite.host, host, 'hosts match');
				assert.strictEqual(actualWebsite.exact, expectedWebsite, 'actual urls match');
			}

			const decryptedEncryptedData = decrypt(password.encrypted, dbpw);
			assert.notStrictEqual(decryptedEncryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			if (decryptedTwofactorEnabled === ERRS.INVALID_DECRYPT) return;
			assert.strictEqual(decryptedEncryptedData, expectedEncrypted, 'encrypted data is the same');
			assert.strictEqual(decrypt(password.username, dbpw), expectedUsername,
						'decrypted username is the same');
		});
		it('fails if it requires 2FA and no 2FA token is passed', async () => {
			const { ascii } = speakeasy.generateSecret({
				name: 'Password manager server',
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: ascii
			});
			const server = await createServer(config);
			const { http, uri, server_public_key, userpw } = config;
			uris.push(uri);

			let { token: loginToken, count } = (await getLoginToken(config))!;

			const passwordId = await setPasword({
				websites: [],
				twofactor_enabled: true,
				username: 'username',
				password: 'password',
				notes: []		
			}, loginToken, count++, config);

			const expectedWebsites = [genURL(), genURL(), genURL()];
			const expected2FAEnabled = Math.random() > 0.5;
			const expectedEncrypted = encrypt({
				twofactor_secret: null,
				username: genRandomString(25),
				password: genRandomString(25),
				notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
			}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
			const expectedUsername = genRandomString(25);
			
			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/update', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: loginToken!,
				count: count++,
				password_id: passwordId!,
				addedWebsites: expectedWebsites.map((website) => {
					return {
						url: website,
						favicon: null
					}
				}),
				username: expectedUsername,
				twofactor_enabled: expected2FAEnabled,
				encrypted: expectedEncrypted
			}));

			server.kill();

			assert.isFalse(response.success, 'API call failed');
			if (response.success) {
				return;
			}
			assert.strictEqual(response.ERR, API_ERRS.MISSING_PARAMS, 'failed with missing parameters');
		});
		it('password can be updated if 2FA is enabled', async () => {
			const { ascii } = speakeasy.generateSecret({
				name: 'Password manager server',
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: ascii
			});
			const server = await createServer(config);
			const { http, uri, server_public_key, userpw, instance_id, dbpw } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;

			const passwordId = await setPasword({
				websites: [],
				twofactor_enabled: false,
				username: 'username',
				password: 'password',
				notes: []		
			}, token, count++, config);

			const expectedWebsites = [genURL(), genURL(), genURL()];
			const expected2FAEnabled = Math.random() > 0.5;
			const expectedEncrypted = encrypt({
				twofactor_secret: null,
				username: genRandomString(25),
				password: genRandomString(25),
				notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
			}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
			const expectedUsername = genRandomString(25);
			
			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/update', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: token!,
				count: count++,
				password_id: passwordId!,
				addedWebsites: expectedWebsites.map((website) => {
					return {
						url: website,
						favicon: null
					}
				}),
				username: expectedUsername,
				twofactor_enabled: expected2FAEnabled,
				twofactor_token: speakeasy.totp({
					secret: ascii
				}),
				encrypted: expectedEncrypted
			}));

			server.kill();

			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) {
				return;
			}
			
			//Check if it was actually created
			const { db, done } = await getDB(uri);
			const password = await db.collection('passwords').findOne({
				_id: new mongo.ObjectId(passwordId!)
			}) as MongoRecord<EncryptedPassword>;
			assert.notStrictEqual(password, null, 'record was found');

			const instance = await db.collection('instances').findOne({
				_id: instance_id
			}) as MongoRecord<EncryptedInstance>;
			assert.notStrictEqual(instance, null, 'instance was found');
			done();

			assert.strictEqual(password.user_id.toHexString(), instance.user_id.toHexString(),
				'user ids match');
			const decryptedTwofactorEnabled = decryptWithSalt(password.twofactor_enabled,
				dbpw);
			assert.notStrictEqual(decryptedTwofactorEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			assert.strictEqual(decryptedTwofactorEnabled, expected2FAEnabled, 'twofactor enabled is the same');

			const actualWebsites = password.websites.map(({ exact, host }) => {
				return {
					host: decrypt(host, dbpw),
					exact: decrypt(exact, dbpw)
				}
			});
			for (const { host, exact } of actualWebsites) {
				assert.notStrictEqual(host, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				assert.notStrictEqual(exact, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			}

			for (let i = 0; i < expectedWebsites.length; i++) {
				const expectedWebsite = expectedWebsites[i];
				const actualWebsite = actualWebsites[i];

				const host = url.parse(expectedWebsite).hostname ||
					url.parse(expectedWebsite).host || expectedWebsite;
				assert.isTrue(!!actualWebsite, 'a website exists at given index');
				assert.strictEqual(actualWebsite.host, host, 'hosts match');
				assert.strictEqual(actualWebsite.exact, expectedWebsite, 'actual urls match');
			}

			const decryptedEncryptedData = decrypt(password.encrypted, dbpw);
			assert.notStrictEqual(decryptedEncryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			if (decryptedTwofactorEnabled === ERRS.INVALID_DECRYPT) return;
			assert.strictEqual(decryptedEncryptedData, expectedEncrypted, 'encrypted data is the same');
		});
		it('fails if token is wrong', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
			});
			const server = await createServer(config);
			await getLoginToken(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/password/update',
				port: http,
				unencrypted: {
					instance_id: config.instance_id.toHexString()
				},
				encrypted: {
					password_id: 'someid' as StringifiedObjectId<EncryptedPassword>,
					token: 'someinvalidtoken',
					count: 0,
					addedWebsites: [],
					twofactor_enabled: false,
					encrypted: 'somestr' as EncodedString<{
						data: Encrypted<EncodedString<{
							twofactor_secret: string;
							password: string;
							notes: string[];
						}>, Hashed<Padded<string, "masterpwdecrypt">, "sha512">, "aes-256-ctr">;
						algorithm: "aes-256-ctr";
					}>,
					username: 'someusername'
				},
				server: server,
				publicKey: server_public_key
			});
		});
		it('fails if instance id is wrong', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
			});
			const server = await createServer(config);
			let { token, count } = (await getLoginToken(config))!;
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/password/update',
				port: http,
				unencrypted: {
					instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
				},
				encrypted: {
					password_id: 'someid' as StringifiedObjectId<EncryptedPassword>,
					token: token!,
					count: count,
					addedWebsites: [],
					username: 'someusername',
					twofactor_enabled: false,
					encrypted: 'somestr' as EncodedString<{
						data: Encrypted<EncodedString<{
							twofactor_secret: string;
							password: string;
							notes: string[];
						}>, Hashed<Padded<string, "masterpwdecrypt">, "sha512">, "aes-256-ctr">;
						algorithm: "aes-256-ctr";
					}>
				},
				server: server,
				publicKey: server_public_key,
				err: API_ERRS.INVALID_CREDENTIALS
			});
		});
		it('fails if password id is wrong', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
			});
			const server = await createServer(config);
			let { token, count } = (await getLoginToken(config))!;
			const { http, uri, server_public_key, instance_id } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/password/update',
				port: http,
				unencrypted: {
					instance_id: instance_id.toHexString()
				},
				encrypted: {
					password_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedPassword>,
					token: token!,
					count: count++,
					addedWebsites: [],
					twofactor_enabled: false,
					encrypted: 'somestr' as EncodedString<{
						data: Encrypted<EncodedString<{
							twofactor_secret: string;
							username: string;
							password: string;
							notes: string[];
						}>, Hashed<Padded<string, "masterpwdecrypt">, "sha512">, "aes-256-ctr">;
						algorithm: "aes-256-ctr";
					}>
				},
				server: server,
				publicKey: server_public_key
			});
		});
	});
}