import { captureURIs, genUserAndDb, createServer, doAPIRequest, testParams } from '../../../lib/util';
import { hash, pad, genRSAKeyPair, decryptWithPrivateKey, ERRS } from '../../../../app/lib/crypto';
import { DEFAULT_EMAIL } from '../../../lib/consts';
import { getDB } from '../../../lib/db';
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

	const { db, done } = await getDB(uri);
	const instance = await db.collection('instances').findOne({
		_id: new mongo.ObjectId(id)
	});
	done();
	t.truthy(instance, 'instance was created and ID is correct');

	t.is(typeof server_key, 'string', 'type of serverkey is string');
});