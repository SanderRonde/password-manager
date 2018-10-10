const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { encryptWithPublicKey, hash, pad, decryptWithPrivateKey, ERRS, encrypt, decryptWithSalt, decrypt } from '../../../../../../app/lib/crypto';
import { genUserAndDb, createServer, doServerAPIRequest, captureURIs, genURL, doesNotThrow, isErr } from '../../../../lib/util';
import { EncryptedPassword, MongoRecord, EncryptedInstance } from '../../../../../app/../../../shared/types/db-types';
import { ENCRYPTION_ALGORITHM } from '../../../../../../app/lib/constants';
import { genRandomString } from '../../../../../../app/lib/util';
import { getDB, doSingleQuery } from '../../../../lib/db';
import * as mongo from 'mongodb'
import { assert } from 'chai';
import * as url from 'url'

export function workflowPasswordTest() {
	parallel('Password', () => {
		const uris = captureURIs();
		it('can log in, set a password, update it and then remove a password', async () => {
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
				instance_private_key,
				dbpw
			} = config;
			uris.push(uri);

			let { token, count } = (await (async () => {
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
				const count = decryptWithPrivateKey(data.count, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				assert.notStrictEqual(count, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT || count === ERRS.INVALID_DECRYPT) {
					return;
				}
				assert.strictEqual(typeof token, 'string', 'token is a string');
				assert.strictEqual(typeof count, 'number', 'type of count is number');

				assert.strictEqual(data.challenge, challenge, 'challenge matches');
				return {
					token, count
				};
			})())!;

			const initialPassword = {
				websites: [genURL(), genURL(), genURL()],
				twofactorEnabled: Math.random() > 0.5,
				u2fEnabled: Math.random() > 0.5,
				encrypted: encrypt({
					twofactor_secret: null,
					username: genRandomString(25),
					password: genRandomString(25),
					notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
				}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM),
				username: genRandomString(25)
			}
			const passwordId = await (async () => {
				const expectedWebsites = initialPassword.websites;
				const expected2FAEnabled = initialPassword.twofactorEnabled;
				const expectedU2FEnabled = initialPassword.u2fEnabled;
				const expectedEncrypted = initialPassword.encrypted;
				const expectedUsername = initialPassword.username;
				
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/password/set', {
					instance_id: config.instance_id.toHexString()
				}, {
					token: token!,
					count: count++,
					websites: expectedWebsites.map((website) => {
						return {
							url: website,
							favicon: null
						}
					}),
					twofactor_enabled: expected2FAEnabled,
					u2f_enabled: expectedU2FEnabled,
					encrypted: expectedEncrypted,
					username: expectedUsername
				}));

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				
				const data = response.data;
				assert.strictEqual(typeof data.id, 'string', 'passed id is a string');

				//Check if it was actually created
				const { db, done } = await getDB(uri);
				const password = await db.collection('passwords').findOne({
					_id: new mongo.ObjectId(data.id)
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
				
				const decryptedU2fEnabled = decryptWithSalt(password.u2f_enabled,
					dbpw);
				assert.notStrictEqual(decryptedU2fEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				assert.strictEqual(decryptedU2fEnabled, false, 'U2F is disabled since U2F is not set up');

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

				return data.id;
			})();
			const updatedPassword = {
				websites: [genURL(), genURL(), genURL()],
				twofactorEnabled: Math.random() > 0.5,
				username: genRandomString(25),
				encrypted: encrypt({
					twofactor_secret: null,
					password: genRandomString(25),
					notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
				}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM)
			}
			await (async () => {
				const expectedWebsites = updatedPassword.websites;
				const expected2FAEnabled = updatedPassword.twofactorEnabled;
				const expectedEncrypted = updatedPassword.encrypted;
				const expectedUsername = updatedPassword.username;
				
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
					removedWebsites: initialPassword.websites.map((website) => {
						return {
							url: website
						}
					}),
					twofactor_enabled: expected2FAEnabled,
					encrypted: expectedEncrypted,
					username: expectedUsername
				}));

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

				assert.strictEqual(decrypt(password.username, dbpw), expectedUsername,
					'username was updated');

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
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/password/remove', {
					instance_id: config.instance_id.toHexString()
				}, {
					token: token!,
					count: count++,
					password_id: passwordId!
				}));
			
				server.kill();
			
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				
				//Check if the password is gone
				const password = await doSingleQuery(uri, async (db) => {
					return db.collection('passwords').findOne({
						_id: new mongo.ObjectId(passwordId!)
					});
				});
				assert.strictEqual(password, null, 'password is gone');
			})();
		});
		it('can log in, set a password, update, and get meta and non-meta data', async () => {
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
				instance_private_key,
				dbpw
			} = config;
			uris.push(uri);

			let { token, count } = (await (async () => {
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
				const count = decryptWithPrivateKey(data.count, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				assert.notStrictEqual(count, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT || count === ERRS.INVALID_DECRYPT) {
					return;
				}
				assert.strictEqual(typeof token, 'string', 'token is a string');
				assert.strictEqual(typeof count, 'number', 'type of count is number');

				assert.strictEqual(data.challenge, challenge, 'challenge matches');
				return {
					token, count
				}
			})())!;

			const initialPassword = {
				websites: [genURL(), genURL(), genURL()],
				twofactorEnabled: Math.random() > 0.5,
				u2fEnabled: false,
				encrypted: encrypt({
					twofactor_secret: null,
					username: genRandomString(25),
					password: genRandomString(25),
					notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
				}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM),
				username: genRandomString(25)
			}
			const passwordId = await (async () => {
				const expectedWebsites = initialPassword.websites;
				const expected2FAEnabled = initialPassword.twofactorEnabled;
				const expectedEncrypted = initialPassword.encrypted;
				const expectedUsername = initialPassword.username;
				const expectedU2FEnabled = initialPassword.u2fEnabled;
				
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/password/set', {
					instance_id: config.instance_id.toHexString()
				}, {
					token: token!,
					count: count++,
					websites: expectedWebsites.map((website) => {
						return {
							url: website,
							favicon: null
						}
					}),
					username: expectedUsername,
					twofactor_enabled: expected2FAEnabled,
					u2f_enabled: expectedU2FEnabled,
					encrypted: expectedEncrypted
				}));

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				
				const data = response.data;
				assert.strictEqual(typeof data.id, 'string', 'passed id is a string');

				//Check if it was actually created
				const { db, done } = await getDB(uri);
				const password = await db.collection('passwords').findOne({
					_id: new mongo.ObjectId(data.id)
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

				const decryptedU2fEnabled = decryptWithSalt(password.u2f_enabled,
					dbpw);
				assert.notStrictEqual(decryptedU2fEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				assert.strictEqual(decryptedU2fEnabled, false, 'U2F is disabled since U2F is not set up');

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

				return data.id;
			})();
			const updatedPassword = {
				websites: [genURL(), genURL(), genURL()],
				twofactorEnabled: Math.random() > 0.5,
				username: genRandomString(25),
				password: genRandomString(25),
				notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
			}
			await (async () => {
				const expectedWebsites = updatedPassword.websites;
				const expected2FAEnabled = updatedPassword.twofactorEnabled;
				const expectedEncrypted = encrypt({
					twofactor_secret: null,
					password: updatedPassword.password,
					notes: updatedPassword.notes
				}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
				const expectedUsername = updatedPassword.username;
				
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
					removedWebsites: initialPassword.websites.map((website) => {
						return {
							url: website
						}
					}),
					twofactor_enabled: expected2FAEnabled,
					encrypted: expectedEncrypted,
					username: expectedUsername,
					u2f_enabled: false
				}));

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

				const decryptedU2fEnabled = decryptWithSalt(password.u2f_enabled,
					dbpw);
				assert.notStrictEqual(decryptedU2fEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				assert.strictEqual(decryptedU2fEnabled, false, 'U2F is disabled since U2F is not set up');

				assert.strictEqual(decrypt(password.username, dbpw), expectedUsername,
					'username was updated');

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
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/password/get', {
					instance_id: config.instance_id.toHexString()
				}, {
					token: token!,
					count: count++,
					password_id: passwordId!
				}));
				
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				const data = response.data;
				const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
				assert.notStrictEqual(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decryptedData === ERRS.INVALID_DECRYPT) return;
			
				const parsed = doesNotThrow(() => {
					return JSON.parse(decryptedData);
				}, 'data can be parsed');
				assert.strictEqual(parsed.id, passwordId, 'password IDs are the same');
			
				const decryptedEncrypted = decrypt(parsed.encrypted, 
					hash(pad(userpw, 'masterpwdecrypt')));
				if (isErr(decryptedEncrypted)) return;
			
				assert.strictEqual(parsed.username, updatedPassword.username, 'username is the same');
				assert.strictEqual(decryptedEncrypted.password, updatedPassword.password, 'password is the same');
				for (let i = 0; i < updatedPassword.notes.length; i++) {
					const expectedNote = updatedPassword.notes[i];
					const actualNote = decryptedEncrypted.notes[i];
			
					assert.isTrue(!!actualNote, 'note exists');
					assert.strictEqual(actualNote, expectedNote, 'notes are the same');
				}
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/password/getmeta', {
					instance_id: config.instance_id.toHexString()
				}, {
					token: token!,
					count: count++,
					password_id: passwordId!
				}));
			
				server.kill();
			
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				const data = response.data;
				const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
				assert.notStrictEqual(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decryptedData === ERRS.INVALID_DECRYPT) return;
			
				const parsed = doesNotThrow(() => {
					return JSON.parse(decryptedData);
				}, 'data can be parsed');
				assert.strictEqual(parsed.id, passwordId, 'password IDs are the same');
			
				for (let i = 0; i < updatedPassword.websites.length; i++) {
					const expectedNote = updatedPassword.websites[i];
					const actualNote = parsed.websites[i];
			
					assert.isTrue(!!actualNote, 'note exists');
					const hostname = url.parse(expectedNote).hostname || 
						url.parse(expectedNote).host || expectedNote
					assert.strictEqual(actualNote.host, hostname, 'host names match');
					assert.strictEqual(actualNote.exact, expectedNote, 'exact urls match');
				}
				assert.strictEqual(parsed.twofactor_enabled, updatedPassword.twofactorEnabled, 'twofactor enabled is the same');
			})();
		});
		it('can log in, set a password and get all metadata', async () => {
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
				instance_private_key,
				dbpw
			} = config;
			uris.push(uri);

			let { token, count } = (await (async () => {
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
				const count = decryptWithPrivateKey(data.count, instance_private_key);
				assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				assert.notStrictEqual(count, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
				if (token === ERRS.INVALID_DECRYPT || count === ERRS.INVALID_DECRYPT) {
					return;
				}
				assert.strictEqual(typeof token, 'string', 'token is a string');
				assert.strictEqual(typeof count, 'number', 'type of count is number');

				assert.strictEqual(data.challenge, challenge, 'challenge matches');
				return {
					token, count
				};
			})())!;

			const initialPassword = {
				websites: [genURL(), genURL(), genURL()],
				twofactorEnabled: Math.random() > 0.5,
				u2fEnabled: Math.random() > 0.5,
				encrypted: encrypt({
					twofactor_secret: null,
					username: genRandomString(25),
					password: genRandomString(25),
					notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
				}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM),
				username: genRandomString(25)
			}
			const passwordId = await (async () => {
				const expectedWebsites = initialPassword.websites;
				const expected2FAEnabled = initialPassword.twofactorEnabled;
				const expectedEncrypted = initialPassword.encrypted;
				const expectedUsername = initialPassword.username;
				const expectedU2FEnabled = initialPassword.u2fEnabled;
				
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/password/set', {
					instance_id: config.instance_id.toHexString()
				}, {
					token: token!,
					count: count++,
					websites: expectedWebsites.map((website) => {
						return {
							url: website,
							favicon: null
						}
					}),
					username: expectedUsername,
					u2f_enabled: expectedU2FEnabled,
					twofactor_enabled: expected2FAEnabled,
					encrypted: expectedEncrypted
				}));

				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				
				const data = response.data;
				assert.strictEqual(typeof data.id, 'string', 'passed id is a string');

				//Check if it was actually created
				const { db, done } = await getDB(uri);
				const password = await db.collection('passwords').findOne({
					_id: new mongo.ObjectId(data.id)
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

				const decryptedU2fEnabled = decryptWithSalt(password.u2f_enabled,
					dbpw);
				assert.notStrictEqual(decryptedU2fEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				assert.strictEqual(decryptedU2fEnabled, false, 'U2F is disabled since U2F is not set up');

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

				return data.id;
			})();
			const updatedPassword = {
				websites: [genURL(), genURL(), genURL()],
				twofactorEnabled: Math.random() > 0.5,
				encrypted: encrypt({
					twofactor_secret: null,
					password: genRandomString(25),
					notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
				}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM),
				username: genRandomString(25),
			}
			await (async () => {
				const expectedWebsites = updatedPassword.websites;
				const expected2FAEnabled = updatedPassword.twofactorEnabled;
				const expectedEncrypted = updatedPassword.encrypted;
				const expectedUsername = updatedPassword.username;
				
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
					removedWebsites: initialPassword.websites.map((website) => {
						return {
							url: website
						}
					}),
					twofactor_enabled: expected2FAEnabled,
					encrypted: expectedEncrypted,
					username: expectedUsername
				}));

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

				assert.strictEqual(decrypt(password.username, dbpw), expectedUsername,
					'username was updated');

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
			})();
			await (async () => {
				const response = JSON.parse(await doServerAPIRequest({ 
					port: http,
					publicKey: server_public_key
				}, '/api/password/allmeta', {
					instance_id: config.instance_id.toHexString()
				}, {
					token: token!,
					count: count++,
					password_hash: hash(pad(userpw, 'masterpwverify'))
				}));
			
				server.kill();
			
				assert.isTrue(response.success, 'API call succeeded');
				if (!response.success) {
					return;
				}
				const data = response.data;
				const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
				assert.notStrictEqual(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
				if (decryptedData === ERRS.INVALID_DECRYPT) return;
			
				const parsed = doesNotThrow(() => {
					return JSON.parse(decryptedData);
				}, 'data can be parsed');
				const expectedPasswords = [updatedPassword];
				const passwordIds = [passwordId];
				assert.strictEqual(parsed.length, expectedPasswords.length, 'exactly 2 passwords are returned');
				for (let i = 0; i < expectedPasswords.length; i++) {
					const parsedValue = parsed[i];
					const expected = expectedPasswords[i];
					assert.strictEqual(parsedValue.id, passwordIds[i], 'password IDs are the same');
					for (let i = 0; i < expected.websites.length; i++) {
						const expectedWebsite = expected.websites[i];
						const actualWebsite = parsedValue.websites[i];
				
						assert.isTrue(!!actualWebsite, 'note exists');
						const hostname = url.parse(expectedWebsite).hostname || 
							url.parse(expectedWebsite).host || expectedWebsite
						assert.strictEqual(actualWebsite.host, hostname, 'host names match');
						assert.strictEqual(actualWebsite.exact, expectedWebsite, 'exact urls match');
					}
					assert.strictEqual(parsedValue.twofactor_enabled, expected.twofactorEnabled, 'twofactor enabled is the same');
				}
			})();
		});
		it('can log in, set and update a password, ' + 
			'call querymeta and get metadata for given query result', async () => {
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
					instance_private_key,
					dbpw
				} = config;
				uris.push(uri);

				let { token, count } = (await (async () => {
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
					const count = decryptWithPrivateKey(data.count, instance_private_key);
					assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
					assert.notStrictEqual(count, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
					if (token === ERRS.INVALID_DECRYPT || count === ERRS.INVALID_DECRYPT) {
						return;
					}
					assert.strictEqual(typeof token, 'string', 'token is a string');
					assert.strictEqual(typeof count, 'number', 'type of count is number');

					assert.strictEqual(data.challenge, challenge, 'challenge matches');
					return {
						token, count
					};
				})())!;

				const matchingHost = `www.${genRandomString(20)}.${genRandomString(3)}`;
				const initialPassword = {
					websites: [genURL(), genURL(), genURL()],
					twofactorEnabled: Math.random() > 0.5,
					u2fEnabled: Math.random() > 0.5,
					encrypted: encrypt({
						twofactor_secret: null,
						username: genRandomString(25),
						password: genRandomString(25),
						notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
					}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM),
					username: genRandomString(25)
				}
				const passwordId = await (async () => {
					const expectedWebsites = initialPassword.websites;
					const expected2FAEnabled = initialPassword.twofactorEnabled;
					const expectedEncrypted = initialPassword.encrypted;
					const expectedUsername = initialPassword.username;
					const expectedU2FEnabled = initialPassword.u2fEnabled;
					
					const response = JSON.parse(await doServerAPIRequest({ 
						port: http,
						publicKey: server_public_key
					}, '/api/password/set', {
						instance_id: config.instance_id.toHexString()
					}, {
						token: token!,
						count: count++,
						websites: expectedWebsites.map((website) => {
							return {
								url: website,
								favicon: null
							}
						}),
						username: expectedUsername,
						u2f_enabled: expectedU2FEnabled,
						twofactor_enabled: expected2FAEnabled,
						encrypted: expectedEncrypted
					}));

					assert.isTrue(response.success, 'API call succeeded');
					if (!response.success) {
						return;
					}
					
					const data = response.data;
					assert.strictEqual(typeof data.id, 'string', 'passed id is a string');

					//Check if it was actually created
					const { db, done } = await getDB(uri);
					const password = await db.collection('passwords').findOne({
						_id: new mongo.ObjectId(data.id)
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

					const decryptedU2fEnabled = decryptWithSalt(password.u2f_enabled,
						dbpw);
					assert.notStrictEqual(decryptedU2fEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
					assert.strictEqual(decryptedU2fEnabled, false, 'U2F is disabled since U2F is not set up');

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

					return data.id;
				})();
				const updatedPassword = {
					websites: [genURL(), genURL(matchingHost), genURL()],
					twofactorEnabled: Math.random() > 0.5,
					username: genRandomString(25),
					password: genRandomString(25),
					notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
				}
				await (async () => {
					const expectedWebsites = updatedPassword.websites;
					const expected2FAEnabled = updatedPassword.twofactorEnabled;
					const expectedEncrypted = encrypt({
						twofactor_secret: null,
						password: updatedPassword.password,
						notes: updatedPassword.notes
					}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
					const expectedUsername = updatedPassword.username;
					
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
						removedWebsites: initialPassword.websites.map((website) => {
							return {
								url: website
							}
						}),
						twofactor_enabled: expected2FAEnabled,
						encrypted: expectedEncrypted,
						username: expectedUsername,
						u2f_enabled: false
					}));

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

					const decryptedU2fEnabled = decryptWithSalt(password.u2f_enabled,
						dbpw);
					assert.notStrictEqual(decryptedU2fEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
					assert.strictEqual(decryptedU2fEnabled, false, 'U2F is disabled since U2F is not set up');

					assert.strictEqual(decrypt(password.username, dbpw), expectedUsername,
						'username was updated');

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
				})();
				await (async () => {
					const response = JSON.parse(await doServerAPIRequest({ 
						port: http,
						publicKey: server_public_key
					}, '/api/password/allmeta', {
						instance_id: config.instance_id.toHexString()
					}, {
						token: token!,
						count: count++,
						password_hash: hash(pad(userpw, 'masterpwverify'))
					}));
						
					assert.isTrue(response.success, 'API call succeeded');
					if (!response.success) {
						return;
					}
					const data = response.data;
					const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
					assert.notStrictEqual(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
					if (decryptedData === ERRS.INVALID_DECRYPT) return;
				
					const parsed = doesNotThrow(() => {
						return JSON.parse(decryptedData);
					}, 'data can be parsed');
					const expectedPasswords = [updatedPassword];
					const passwordIds = [passwordId];
					assert.strictEqual(parsed.length, expectedPasswords.length, 'exactly 2 passwords are returned');
					for (let i = 0; i < expectedPasswords.length; i++) {
						const parsedValue = parsed[i];
						const expected = expectedPasswords[i];
						assert.strictEqual(parsedValue.id, passwordIds[i], 'password IDs are the same');
						for (let i = 0; i < expected.websites.length; i++) {
							const expectedWebsite = expected.websites[i];
							const actualWebsite = parsedValue.websites[i];
					
							assert.isTrue(!!actualWebsite, 'note exists');
							const hostname = url.parse(expectedWebsite).hostname || 
								url.parse(expectedWebsite).host || expectedWebsite
							assert.strictEqual(actualWebsite.host, hostname, 'host names match');
							assert.strictEqual(actualWebsite.exact, expectedWebsite, 'exact urls match');
						}
						assert.strictEqual(parsedValue.twofactor_enabled, expected.twofactorEnabled, 'twofactor enabled is the same');
					}
				})();
				const queryResults = await (async () => {
					const response = JSON.parse(await doServerAPIRequest({ 
						port: http,
						publicKey: server_public_key
					}, '/api/password/querymeta', {
						instance_id: config.instance_id.toHexString()
					}, {
						token: token!,
						count: count++,
						url: `http${
							Math.random() > 0.5 ? 's' : ''
						}://${
							matchingHost
						}/some/path/to/something.html`
					}));
					
					assert.isTrue(response.success, 'API call succeeded');
					if (!response.success) {
						return;
					}
					const data = response.data;
					const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
					assert.notStrictEqual(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
					if (decryptedData === ERRS.INVALID_DECRYPT) return;
				
					const parsed = doesNotThrow(() => {
						return JSON.parse(decryptedData);
					}, 'data can be parsed').sort((a, b) => {
						if (a.id < b.id) return -1;
						if (a.id > b.id) return 1;
						return 0;
					});
					
					const expectedPasswords = [{...updatedPassword, index: 0}];
					const passwordIds = [passwordId];
					const matchingExpectedPasswords = expectedPasswords.filter((password) => {
						for (const website of password.websites) {
							if (website.indexOf(matchingHost) > -1) {
								return true;
							}
						}
						return false;
					});
					assert.strictEqual(parsed.length, matchingExpectedPasswords.length, 
						'amount of matches match');
				
					for (let i = 0; i < matchingExpectedPasswords.length; i++) {
						const expected = matchingExpectedPasswords[i];
						const actual = parsed[i];
				
						assert.strictEqual(actual.id, passwordIds[expected.index], 'ids match');
						assert.strictEqual(actual.twofactor_enabled, expected.twofactorEnabled);
						for (let i = 0; i < expected.websites.length; i++) {
							const expectedWebsite = expected.websites[i];
							const actualWebsite = actual.websites[i];
					
							assert.isTrue(!!actualWebsite, 'note exists');
							const hostname = url.parse(expectedWebsite).hostname || 
								url.parse(expectedWebsite).host || expectedWebsite
							assert.strictEqual(actualWebsite.host, hostname, 'host names match');
							assert.strictEqual(actualWebsite.exact, expectedWebsite, 'exact urls match');
						}
					}

					return parsed;
				})();
				await (async () => {
					const response = JSON.parse(await doServerAPIRequest({ 
						port: http,
						publicKey: server_public_key
					}, '/api/password/get', {
						instance_id: config.instance_id.toHexString()
					}, {
						token: token!,
						count: count++,
						password_id: queryResults![0].id
					}));
				
					server.kill();
				
					assert.isTrue(response.success, 'API call succeeded');
					if (!response.success) {
						return;
					}
					const data = response.data;
					const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
					assert.notStrictEqual(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
					if (decryptedData === ERRS.INVALID_DECRYPT) return;
				
					const parsed = doesNotThrow(() => {
						return JSON.parse(decryptedData);
					}, 'data can be parsed');
					assert.strictEqual(parsed.id, passwordId, 'password IDs are the same');
				
					const decryptedEncrypted = decrypt(parsed.encrypted, 
						hash(pad(userpw, 'masterpwdecrypt')));
					if (isErr(decryptedEncrypted)) return;
				
					assert.strictEqual(parsed.username, updatedPassword.username, 'username is the same');
					assert.strictEqual(decryptedEncrypted.password, updatedPassword.password, 'password is the same');
					for (let i = 0; i < updatedPassword.notes.length; i++) {
						const expectedNote = updatedPassword.notes[i];
						const actualNote = decryptedEncrypted.notes[i];
				
						assert.isTrue(!!actualNote, 'note exists');
						assert.strictEqual(actualNote, expectedNote, 'notes are the same');
					}
				})();
			});
	});
}