const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { captureURIs, genUserAndDb, createServer, getLoginToken, setPasword, doServerAPIRequest } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance, EncryptedPassword } from '../../../../../app/../../../shared/types/db-types';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { API_ERRS } from '../../../../../app/../../../shared/types/api';
import { doSingleQuery } from '../../../../lib/db';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function passwordRemoveTest() {
	parallel('Remove', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/password/remove', {
			instance_id: 'string'
		}, {}, {
			count: 'number',
			token: 'string',
			password_id: 'string',
		}, {
			twofactor_token: 'string'
		});
		it('can be removed if 2FA is disabled', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true
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
			}, '/api/password/remove', {
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
			
			//Check if the password is gone
			const password = await doSingleQuery(uri, async (db) => {
				return db.collection('passwords').findOne({
					_id: new mongo.ObjectId(passwordId!)
				});
			});
			assert.notStrictEqual(password, null, 'password is still there');
		});
		it('can be removed if 2FA is enabled', async () => {
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

			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/remove', {
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
			
			//Check if the password is gone
			const password = await doSingleQuery(uri, async (db) => {
				return db.collection('passwords').findOne({
					_id: new mongo.ObjectId(passwordId!)
				});
			});
			assert.strictEqual(password, null, 'password is gone');
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
				route: '/api/password/remove',
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
				route: '/api/password/remove',
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
				route: '/api/password/remove',
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