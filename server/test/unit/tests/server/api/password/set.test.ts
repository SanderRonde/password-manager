const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { MongoRecord, EncryptedPassword, EncryptedInstance, StringifiedObjectId } from '../../../../../app/../../../shared/types/db-types';
import { encrypt, hash, pad, decryptWithSalt, ERRS, decrypt, Encrypted, Hashed, Padded } from '../../../../../../app/lib/crypto';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest, getLoginToken, genURL } from '../../../../lib/util';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { ENCRYPTION_ALGORITHM } from '../../../../../../app/lib/constants';
import { API_ERRS } from '../../../../../app/../../../shared/types/api';
import { genRandomString } from '../../../../../../app/lib/util';
import { getDB } from '../../../../lib/db';
import * as mongo from 'mongodb'
import * as url from 'url'
import { assert } from 'chai';

export function passwordSetTest() {
	parallel('Set', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/password/set', {
			instance_id: 'string'
		}, {}, {
			token: 'string',
			count: 'number',
			websites: 'array',
			twofactor_enabled: 'boolean',
			encrypted: 'string'
		}, {});
		it('password can be created', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true
			});
			const server = await createServer(config);
			const { http, uri, server_public_key, userpw, instance_id, dbpw } = config;
			uris.push(uri);

			const token = await getLoginToken(config);

			const expectedWebsites = [genURL(), genURL(), genURL()];
			const expected2FAEnabled = Math.random() > 0.5;
			const expectedEncrypted = encrypt({
				username: genRandomString(25),
				password: genRandomString(25),
				notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
			}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
			
			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/set', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: token!,
				count: config.count++,
				websites: expectedWebsites,
				twofactor_enabled: expected2FAEnabled,
				encrypted: expectedEncrypted
			}));

			server.kill();

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
				route: '/api/password/set',
				port: http,
				unencrypted: {
					instance_id: config.instance_id.toHexString()
				},
				encrypted: {
					token: 'someinvalidtoken',
					count: config.count++,
					websites: [],
					twofactor_enabled: false,
					encrypted: 'somestr' as EncodedString<{
						data: Encrypted<EncodedString<{
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
		it('fails if instance id is wrong', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
			});
			const server = await createServer(config);
			const token = await getLoginToken(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/password/set',
				port: http,
				unencrypted: {
					instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
				},
				encrypted: {
					token: token!,
					count: config.count++,
					websites: [],
					twofactor_enabled: false,
					encrypted: 'somestr' as EncodedString<{
						data: Encrypted<EncodedString<{
							username: string;
							password: string;
							notes: string[];
						}>, Hashed<Padded<string, "masterpwdecrypt">, "sha512">, "aes-256-ctr">;
						algorithm: "aes-256-ctr";
					}>
				},
				server: server,
				publicKey: server_public_key,
				err: API_ERRS.MISSING_PARAMS
			});
		});
	});
}