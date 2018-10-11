const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { captureURIs, doServerAPIRequest, createServer, genUserAndDb } from '../../../../../lib/util';
import { EncryptedInstance, StringifiedObjectId } from '../../../../../../app/../../../shared/types/db-types';
import { testParams, testInvalidCredentials } from '../../../../../lib/macros';
import { API_ERRS } from '../../../../../../app/../../../shared/types/api';
import { DEFAULT_EMAIL } from '../../../../../../../app/lib/constants';
import { pad, hash } from '../../../../../../../app/lib/crypto';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function u2fDisableTest() {
	parallel('Disable', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/instance/u2f/disable', {
			instance_id: 'string'
		}, {}, {
			password: 'string'
		}, {});
		it('state is unchanged if already disabled', async () => {
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
			}, '/api/instance/2fa/disable', {
				instance_id: instance_id.toHexString(),
				twofactor_token: 'sometoken'
			}, {
				password: hash(pad(userpw, 'masterpwverify')),
			}));

			server.kill();

			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) return;
			const data = response.data;
			assert.strictEqual((data as {
				message: 'state unchanged (was already set)'
			}).message, 'state unchanged (was already set)', 'state is unchanged');
		});
		it('fails if password is wrong', async () => {
			const twofactor = speakeasy.generateSecret();
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: true,
				twofactor_secret: twofactor.ascii
			});
			const server = await createServer(config);
			const { http, userpw, uri, instance_id, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/instance/u2f/disable',
				port: http,
				encrypted: {
					password: hash(pad(userpw + 'wrongpw', 'masterpwverify'))
				},
				unencrypted: {
					instance_id: instance_id.toHexString(),
					email: DEFAULT_EMAIL,
					twofactor_token: speakeasy.totp({
						secret: twofactor.ascii,
						time: Date.now() - (60 * 60)
					})
				},
				server: server,
				publicKey: server_public_key
			});
		});
		it('fails if instance id wrong', async () => {
			const twofactor = speakeasy.generateSecret();
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				instance_twofactor_enabled: true,
				twofactor_secret: twofactor.ascii
			});
			const server = await createServer(config);
			const { http, userpw, uri, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/instance/u2f/disable',
				port: http,
				encrypted: {
					password: hash(pad(userpw, 'masterpwverify'))
				},
				unencrypted: {
					instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>,
					email: DEFAULT_EMAIL,
					twofactor_token: speakeasy.totp({
						secret: twofactor.ascii,
						time: Date.now() - (60 * 60)
					})
				},
				server: server,
				publicKey: server_public_key,
				err: API_ERRS.INVALID_CREDENTIALS
			});
		});
	});
}