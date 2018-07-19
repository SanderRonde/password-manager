import { captureURIs, genUserAndDb, createServer, doAPIRequest } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance } from '../../../../../app/database/db-types';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { API_ERRS } from '../../../../../app/api';
import mongo = require('mongodb');
import { test } from 'ava';

const uris = captureURIs(test);
testParams(test, uris, '/api/instance/extend_key', {
	instance_id: 'string',
	oldToken: 'string'
}, {}, {}, {});
test('throws an error if token is invalid', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer(config);
	const { 
		http, 
		uri, 
		instance_id
	} = config;
	uris.push(uri);

	const response = JSON.parse(await doAPIRequest({ port: http }, '/api/instance/extend_key', {
		instance_id: instance_id.toHexString(),
		oldToken: 'someinvalidtoken'
	}));

	server.kill();

	t.false(response.success, 'API call succeeded');
	if (response.success) {
		return;
	}
	t.is(response.ERR, API_ERRS.INVALID_CREDENTIALS, 'got invalid credentials error');
});
test('fails if instance id is wrong', async t => {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	await testInvalidCredentials(t, {
		route: '/api/instance/extend_key',
		port: http,
		encrypted: {},
		unencrypted: {
			instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>,
			oldToken: 'someinvalidtoken'
		},
		server: server,
		publicKey: server_public_key
	});
});