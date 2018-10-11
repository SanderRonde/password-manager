const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { captureURIs, genUserAndDb, createServer, getLoginToken, setPasword, doServerAPIRequest, genURL, doesNotThrow, isErr } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance, EncryptedPassword } from '../../../../../../app/../../shared/types/db-types';
import { decryptWithPrivateKey, ERRS, decrypt, hash, pad } from '../../../../../../app/lib/crypto';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { API_ERRS } from '../../../../../app/../../../shared/types/api';
import { genRandomString } from '../../../../../../app/lib/util';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function passwordGetTest() {
	parallel('Get', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/password/get', {
			instance_id: 'string'
		}, {}, {
			token: 'string',
			count: 'number',
			password_id: 'string',
		}, {
			twofactor_token: 'string',
			u2f_token: 'string'
		});
		it('can get the password if 2FA is disabled', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true
			});
			const server = await createServer(config);
			const { http, uri, server_public_key, instance_private_key, userpw } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;

			const websites = [genURL(), genURL()]
			const username = genRandomString(20);
			const password = genRandomString(2);
			const notes = [genRandomString(10), genRandomString(10), genRandomString(10)]
			const passwordId = await setPasword({
				websites,
				twofactor_enabled: false,
				u2f_enabled: false,
				username,
				password,
				notes,
			}, token, count++, config);

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

			assert.strictEqual(parsed.username, username, 'username is the same');
			assert.strictEqual(decryptedEncrypted.password, password, 'password is the same');
			for (let i = 0; i < notes.length; i++) {
				const expectedNote = notes[i];
				const actualNote = decryptedEncrypted.notes[i];

				assert.isTrue(!!actualNote, 'note exists');
				assert.strictEqual(actualNote, expectedNote, 'notes are the same');
			}
		});
		it('fails if 2FA is enabled but no 2FA token is passed', async () => {
			const secret = speakeasy.generateSecret({
				name: 'Password manager server',
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: secret.ascii
			});
			const server = await createServer(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;

			const passwordId = await setPasword({
				websites: [],
				twofactor_enabled: true,
				u2f_enabled: false,
				username: 'username',
				password: 'password',
				notes: []		
			}, token, count++, config);

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

			server.kill();

			assert.isFalse(response.success, 'API call failed');
			if (response.success) {
				return;
			}
			assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS,
				'invalid credentials error was thrown');
		});
		it('can get the password if 2FA is enabled', async () => {
			const secret = speakeasy.generateSecret({
				name: 'Password manager server',
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: secret.ascii
			});
			const server = await createServer(config);
			const { http, uri, server_public_key, instance_private_key, userpw } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;

			const websites = [genURL(), genURL()]
			const username = genRandomString(20);
			const password = genRandomString(2);
			const notes = [genRandomString(10), genRandomString(10), genRandomString(10)]
			const passwordId = await setPasword({
				websites,
				twofactor_enabled: false,
				u2f_enabled: false,
				username,
				password,
				notes,
			}, token, count++, config);

			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/get', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: token!,
				count: count++,
				password_id: passwordId!,
				twofactor_token: speakeasy.totp({
					secret: secret.ascii
				})
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

			assert.strictEqual(parsed.username, username, 'username is the same');
			assert.strictEqual(decryptedEncrypted.password, password, 'password is the same');
			for (let i = 0; i < notes.length; i++) {
				const expectedNote = notes[i];
				const actualNote = decryptedEncrypted.notes[i];

				assert.isTrue(!!actualNote, 'note exists');
				assert.strictEqual(actualNote, expectedNote, 'notes are the same');
			}
		});
		it('fails if auth token is wrong', async () => {
			const secret = speakeasy.generateSecret({
				name: 'Password manager server',
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: secret.ascii
			});
			const server = await createServer(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;
			const passwordId = await setPasword({
				websites: [],
				twofactor_enabled: false,
				u2f_enabled: false,
				username: 'username',
				password: 'password',
				notes: []		
			}, token, count++, config);

			await testInvalidCredentials({
				route: '/api/password/get',
				port: http,
				unencrypted: {
					instance_id: config.instance_id.toHexString()
				},
				encrypted: {
					count: count++,
					token: 'wrongtoken',
					password_id: passwordId!
				},
				server: server,
				publicKey: server_public_key
			});
		});
		it('fails if instance id is wrong', async () => {
			const secret = speakeasy.generateSecret({
				name: 'Password manager server',
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: secret.ascii
			});
			const server = await createServer(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;
			const passwordId = await setPasword({
				websites: [],
				twofactor_enabled: false,
				u2f_enabled: false,
				username: 'username',
				password: 'password',
				notes: []		
			}, token, count++, config);

			await testInvalidCredentials({
				route: '/api/password/get',
				port: http,
				unencrypted: {
					instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
				},
				encrypted: {
					count: count++,
					token: token!,
					password_id: passwordId!
				},
				server: server,
				publicKey: server_public_key,
				err: API_ERRS.INVALID_CREDENTIALS
			});
		});
		it('fails if password id is wrong', async () => {
			const secret = speakeasy.generateSecret({
				name: 'Password manager server',
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: secret.ascii
			});
			const server = await createServer(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;
			await setPasword({
				websites: [],
				twofactor_enabled: false,
				u2f_enabled: false,
				username: 'username',
				password: 'password',
				notes: []		
			}, token, count++, config);

			await testInvalidCredentials({
				route: '/api/password/get',
				port: http,
				unencrypted: {
					instance_id: config.instance_id.toHexString()
				},
				encrypted: {
					count: count++,
					token: token!,
					password_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedPassword>
				},
				server: server,
				publicKey: server_public_key
			});
		});
	});
}