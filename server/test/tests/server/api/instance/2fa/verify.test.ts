import { captureURIs, doServerAPIRequest, createServer, genUserAndDb } from '../../../../../lib/util';
import { EncryptedInstance, StringifiedObjectId } from '../../../../../../app/../../shared/types/db-types';
import { testParams, testInvalidCredentials } from '../../../../../lib/macros';
import { API_ERRS } from '../../../../../../app/../../shared/types/api';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function twofactorVerifyTest() {
	describe('Verify', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/instance/2fa/verify', {
			instance_id: 'string',
			twofactor_token: 'string',
			pw_verification_token: 'string'
		}, {}, {}, {});
		it('fails if account has no 2FA setup', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false,
				instance_twofactor_enabled: false,
				twofactor_secret: null!
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				instance_id, 
			} = config;
			uris.push(uri);

			const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/2fa/verify', {
				instance_id: instance_id.toHexString(),
				twofactor_token: 'sometoken',
				pw_verification_token: 'sometoken'
			}));

			server.kill();

			assert.isFalse(response.success, 'API call failed');
			if (response.success) return;
			assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS, 'got invalid credentials error');
		});
		it('fails if an invalid 2FA token is passed', async () => {
			const twofactor = speakeasy.generateSecretTest();
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: true,
				twofactor_secret: twofactor.base32
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				instance_id, 
			} = config;
			uris.push(uri);

			const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/2fa/verify', {
				instance_id: instance_id.toHexString(),
				twofactor_token: speakeasy.totp({
					secret: twofactor.base32,
					encoding: 'base32',
					time: Date.now() - (60 * 60)
				}),
				pw_verification_token: 'sometoken'
			}));

			server.kill();

			assert.isFalse(response.success, 'API call failed');
			if (response.success) return;
			assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS, 'got invalid credentials error');
		});
		it('fails if an invalid password verification token is passed', async () => {
			const twofactor = speakeasy.generateSecretTest();
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: true,
				twofactor_secret: twofactor.base32
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				instance_id, 
			} = config;
			uris.push(uri);

			const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/2fa/verify', {
				instance_id: instance_id.toHexString(),
				twofactor_token: speakeasy.totp({
					secret: twofactor.base32,
					encoding: 'base32'
				}),
				pw_verification_token: 'sometoken'
			}));

			server.kill();

			assert.isFalse(response.success, 'API call failed');
			if (response.success) return;
			assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS, 'got invalid credentials error');
		});
		it('fails if instance id wrong', async () => {
			const twofactor = speakeasy.generateSecretTest();
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: true,
				twofactor_secret: twofactor.base32
			});
			const server = await createServer(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/instance/2fa/verify',
				port: http,
				encrypted: {},
				unencrypted: {
					instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>,
					twofactor_token: speakeasy.totp({
						secret: twofactor.base32,
						encoding: 'base32'
					}),
					pw_verification_token: 'sometoken'
				},
				server: server,
				publicKey: server_public_key
			});
		});
	});
}