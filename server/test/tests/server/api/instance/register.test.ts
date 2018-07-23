import { captureURIs, genUserAndDb, createServer, doAPIRequest } from '../../../../lib/util';
import { hash, pad, genRSAKeyPair, decryptWithPrivateKey, ERRS } from '../../../../../app/lib/crypto';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { DEFAULT_EMAIL } from '../../../../lib/consts';
import { doSingleQuery } from '../../../../lib/db';
import mongo = require('mongodb');
import { test } from 'ava';

const uris = captureURIs(test);
testParams(test, uris, '/api/instance/register', {
	email: 'string',
	password: 'string',
	public_key: 'string'
}, {}, {}, {});
test('instance can be created', async t => {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	const { http, userpw, uri } = config;
	uris.push(uri);

	const keyPair = genRSAKeyPair();
	const response = JSON.parse(await doAPIRequest({ port: http }, '/api/instance/register', {
		email: DEFAULT_EMAIL,
		password: hash(pad(userpw, 'masterpwverify')),
		public_key: keyPair.publicKey
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	const id = decryptWithPrivateKey(response.data.id, keyPair.privateKey);
	const server_key = decryptWithPrivateKey(response.data.server_key, 
		keyPair.privateKey)
	
	t.not(id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
	t.not(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
	if (id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
		return;
	}


	const instance = await doSingleQuery(uri, async (db) => {
		return await db.collection('instances').findOne({
			_id: new mongo.ObjectId(id)
		});
	})
	t.truthy(instance, 'instance was created and ID is correct');

	t.is(typeof server_key, 'string', 'type of serverkey is string');
});
test('fails if password is wrong', async t => {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	const { http, userpw, uri, server_public_key } = config;
	uris.push(uri);

	const keyPair = genRSAKeyPair();
	await testInvalidCredentials(t, {
		route: '/api/instance/register',
		port: http,
		encrypted: {},
		unencrypted: {
			email: DEFAULT_EMAIL,
			password: hash(pad(userpw + 'wrongpw', 'masterpwverify')),
			public_key: keyPair.publicKey
		},
		server: server,
		publicKey: server_public_key
	});
});