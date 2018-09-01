const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { captureURIs, doServerAPIRequest, createServer, genUserAndDb } from '../../../../../lib/util';
import { EncryptedInstance, StringifiedObjectId } from '../../../../../../app/../../../shared/types/db-types';
import { testParams, testInvalidCredentials } from '../../../../../lib/macros';
import { API_ERRS } from '../../../../../../app/../../../shared/types/api';
import { DEFAULT_EMAIL } from '../../../../../../../app/lib/constants';
import { pad, hash } from '../../../../../../../app/lib/crypto';
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function u2fEnableTest() {
	parallel('Enable', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/instance/u2f/enable', {
			instance_id: 'string'
		}, {}, {
			password: 'string'
		}, {});
		it('can enable U2F when no U2F secret is set', async () => {
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
			}, '/api/instance/u2f/enable', {
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
		});
		it('fails if password is wrong', async () => {
			const config = await genUserAndDb();
			const server = await createServer(config);
			const { http, userpw, uri, instance_id, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/instance/u2f/enable',
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
				route: '/api/instance/u2f/enable',
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
				err: API_ERRS.MISSING_PARAMS
			});
		});
	});
}