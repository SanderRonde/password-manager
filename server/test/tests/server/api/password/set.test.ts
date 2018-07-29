import { captureURIs, genUserAndDb, createServer, doServerAPIRequest, getLoginToken, genURL } from '../../../../lib/util';
import { MongoRecord, EncryptedPassword, EncryptedInstance, StringifiedObjectId } from '../../../../../app/database/db-types';
import { encrypt, hash, pad, decryptWithSalt, ERRS, decrypt, Encrypted, Hashed, Padded } from '../../../../../app/lib/crypto';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { ENCRYPTION_ALGORITHM } from '../../../../../app/lib/constants';
import { genRandomString } from '../../../../../app/lib/util';
import { API_ERRS } from '../../../../../app/api';
import { getDB } from '../../../../lib/db';
import mongo = require('mongodb');
import url = require('url');
import { test } from 'ava';

const uris = captureURIs(test);
testParams(test, uris, '/api/password/set', {
	instance_id: 'string'
}, {}, {
	token: 'string',
	count: 'number',
	websites: 'array',
	twofactor_enabled: 'boolean',
	encrypted: 'string'
}, {});
test('password can be created', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true
	});
	const server = await createServer(config);
	const { http, uri, server_public_key, userpw, instance_id, dbpw } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const expectedWebsites = [genURL(), genURL(), genURL()];
	const expected2FAEnabled = Math.random() > 0.5;
	const expectedEncrypted = encrypt({
		username: genRandomString(25),
		password: genRandomString(25),
		notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
	}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
	
	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/set', {
		instance_id: config.instance_id.toHexString()
	}, {
		token: token!,
		count: config.count++,
		websites: expectedWebsites,
		twofactor_enabled: expected2FAEnabled,
		encrypted: expectedEncrypted
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	
	const data = response.data;
	t.is(typeof data.id, 'string', 'passed id is a string');

	//Check if it was actually created
	const { db, done } = await getDB(uri);
	const password = await db.collection('passwords').findOne({
		_id: new mongo.ObjectId(data.id)
	}) as MongoRecord<EncryptedPassword>;
	t.not(password, null, 'record was found');

	const instance = await db.collection('instances').findOne({
		_id: instance_id
	}) as MongoRecord<EncryptedInstance>;
	t.not(instance, null, 'instance was found');
	done();

	t.is(password.user_id.toHexString(), instance.user_id.toHexString(),
		'user ids match');
	const decryptedTwofactorEnabled = decryptWithSalt(password.twofactor_enabled,
		dbpw);
	t.not(decryptedTwofactorEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	t.is(decryptedTwofactorEnabled, expected2FAEnabled, 'twofactor enabled is the same');

	const actualWebsites = password.websites.map(({ exact, host }) => {
		return {
			host: decrypt(host, dbpw),
			exact: decrypt(exact, dbpw)
		}
	});
	for (const { host, exact } of actualWebsites) {
		t.not(host, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		t.not(exact, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	}

	for (let i = 0; i < expectedWebsites.length; i++) {
		const expectedWebsite = expectedWebsites[i];
		const actualWebsite = actualWebsites[i];

		const host = url.parse(expectedWebsite).hostname ||
			url.parse(expectedWebsite).host || expectedWebsite;
		t.truthy(actualWebsite, 'a website exists at given index');
		t.is(actualWebsite.host, host, 'hosts match');
		t.is(actualWebsite.exact, expectedWebsite, 'actual urls match');
	}

	const decryptedEncryptedData = decrypt(password.encrypted, dbpw);
	t.not(decryptedEncryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	if (decryptedTwofactorEnabled === ERRS.INVALID_DECRYPT) return;
	t.is(decryptedEncryptedData, expectedEncrypted, 'encrypted data is the same');
});
test('fails if token is wrong', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
	});
	const server = await createServer(config);
	await getLoginToken(t, config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	await testInvalidCredentials(t, {
		route: '/api/password/set',
		port: http,
		unencrypted: {
			instance_id: config.instance_id.toHexString()
		},
		encrypted: {
			token: 'someinvalidtoken',
			count: config.count++,
			websites: [],
			twofactor_enabled: false,
			encrypted: 'somestr' as EncodedString<{
				data: Encrypted<EncodedString<{
					username: string;
					password: string;
					notes: string[];
				}>, Hashed<Padded<string, "masterpwdecrypt">, "sha512">, "aes-256-ctr">;
				algorithm: "aes-256-ctr";
			}>
		},
		server: server,
		publicKey: server_public_key
	});
});
test('fails if instance id is wrong', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
	});
	const server = await createServer(config);
	const token = await getLoginToken(t, config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	await testInvalidCredentials(t, {
		route: '/api/password/set',
		port: http,
		unencrypted: {
			instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
		},
		encrypted: {
			token: token!,
			count: config.count++,
			websites: [],
			twofactor_enabled: false,
			encrypted: 'somestr' as EncodedString<{
				data: Encrypted<EncodedString<{
					username: string;
					password: string;
					notes: string[];
				}>, Hashed<Padded<string, "masterpwdecrypt">, "sha512">, "aes-256-ctr">;
				algorithm: "aes-256-ctr";
			}>
		},
		server: server,
		publicKey: server_public_key,
		err: API_ERRS.MISSING_PARAMS
	});
});