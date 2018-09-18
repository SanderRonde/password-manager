const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { StringifiedObjectId, EncryptedInstance } from '../../../../../app/../../../shared/types/db-types';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest } from '../../../../lib/util';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { API_ERRS } from '../../../../../app/../../../shared/types/api';
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function extendKeyTest() {
	parallel('Extend Key', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/instance/extend_key', {
			instance_id: 'string',
		}, {}, {
			count: 'number',
			old_token: 'string'
		}, {});
		it('throws an error if token is invalid', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				instance_id,
				server_public_key
			} = config;
			uris.push(uri);

			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/instance/extend_key', {
				instance_id: instance_id.toHexString()
			}, {
				count: 0,
				old_token: 'someinvalidtoken'
			}));

			server.kill();

			assert.isFalse(response.success, 'API call succeeded');
			if (response.success) {
				return;
			}
			assert.strictEqual(response.ERR, API_ERRS.INVALID_CREDENTIALS, 'got invalid credentials error');
		});
		it('fails if instance id is wrong', async () => {
			const config = await genUserAndDb();
			const server = await createServer(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/instance/extend_key',
				port: http,
				encrypted: {
					old_token: 'someinvalidtoken',
					count: 0,
				},
				unencrypted: {
					instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
				},
				server: server,
				publicKey: server_public_key
			});
		});
	});
}