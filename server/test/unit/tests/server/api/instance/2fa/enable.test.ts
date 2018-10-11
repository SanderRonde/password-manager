const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { captureURIs, doServerAPIRequest, createServer, genUserAndDb } from '../../../../../lib/util';
import { EncryptedInstance, StringifiedObjectId } from '../../../../../../app/../../../shared/types/db-types';
import { pad, hash, decryptWithSalt, ERRS } from '../../../../../../../app/lib/crypto';
import { testParams, testInvalidCredentials } from '../../../../../lib/macros';
import { API_ERRS } from '../../../../../../app/../../../shared/types/api';
import { DEFAULT_EMAIL } from '../../../../../../../app/lib/constants';
import { doSingleQuery } from '../../../../../lib/db';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function twofactorEnableTest() {
	parallel('Enable', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/instance/2fa/enable', {
			instance_id: 'string'
		}, {}, {
			password: 'string'
		}, {});
		it('can enable 2FA when no 2FA secret is set', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false,
				instance_twofactor_enabled: false,
				twofactor_secret: null!
			});
			const server = await createServer(config);
			const { 
				http, 
				userpw, 
				uri, 
				instance_id, 
				server_public_key
			} = config;
			uris.push(uri);

			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/instance/2fa/enable', {
				instance_id: instance_id.toHexString()
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
			assert.isFalse(finalData.enabled, '2FA was not already enabled');
			if (finalData.enabled) return;
			assert.isTrue(finalData.verify_2fa_required, 
				'further verification is needed');
			assert.strictEqual(typeof finalData.auth_url, 'string', 'auth_url is a string');
			assert.match(finalData.auth_url, 
				/otpauth:\/\/totp\/(.*)\?secret=\w+/,
				'url is an otp auth url');
		});
		it('can enable 2FA when a 2FA secret is already set', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: false,
				twofactor_secret: speakeasy.generateSecret().ascii
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

			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/instance/2fa/enable', {
				instance_id: instance_id.toHexString()
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
		});
		it('does not change it if 2FA was aleady enabled in this instance', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: true,
				twofactor_secret: speakeasy.generateSecret().ascii
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
			assert.strictEqual((data as {
				message: 'state unchanged (was already set)'
			}).message, 'state unchanged (was already set)', 'state is unchanged');

			const instance = await doSingleQuery(uri, async (db) => {
				return await db.collection('instances').findOne({
					_id: instance_id
				}) as EncryptedInstance;
			});
			assert.isTrue(!!instance, 'instance exists');
			if (!instance) return;
			const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
			assert.notStrictEqual(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			if (decrypt === ERRS.INVALID_DECRYPT) return;
			assert.strictEqual(decrypt, true, '2FA is still enabled');
		});
		it('fails if password is wrong', async () => {
			const config = await genUserAndDb();
			const server = await createServer(config);
			const { http, userpw, uri, instance_id, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/instance/2fa/enable',
				port: http,
				encrypted: {
					password: hash(pad(userpw + 'wrongpw', 'masterpwverify'))
				},
				unencrypted: {
					instance_id: instance_id.toHexString(),
					email: DEFAULT_EMAIL,
				},
				server: server,
				publicKey: server_public_key
			});
		});
		it('fails if instance id is wrong', async () => {
			const config = await genUserAndDb();
			const server = await createServer(config);
			const { http, userpw, uri, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/instance/2fa/enable',
				port: http,
				encrypted: {
					password: hash(pad(userpw, 'masterpwverify'))
				},
				unencrypted: {
					instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>,
					email: DEFAULT_EMAIL
				},
				server: server,
				publicKey: server_public_key,
				err: API_ERRS.INVALID_CREDENTIALS
			});
		});
	});
}