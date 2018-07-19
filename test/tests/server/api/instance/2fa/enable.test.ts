import { captureURIs, doAPIRequest, createServer, genUserAndDb } from '../../../../../lib/util';
import { EncryptedInstance, StringifiedObjectId } from '../../../../../../app/database/db-types';
import { pad, hash, decryptWithSalt, ERRS } from '../../../../../../app/lib/crypto';
import { testParams, testInvalidCredentials } from '../../../../../lib/macros';
import { DEFAULT_EMAIL } from '../../../../../lib/consts';
import { doSingleQuery } from '../../../../../lib/db';
import speakeasy = require('speakeasy');
import mongo = require('mongodb');
import { test } from 'ava';

const uris = captureURIs(test);
testParams(test, uris, '/api/instance/2fa/enable', {
	instance_id: 'string',
	password: 'string',
	email: 'string'
}, {}, {}, {});
test('can enable 2FA when no 2FA secret is set', async t => {
	const config = await genUserAndDb(t, {
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
	} = config;
	uris.push(uri);

	const response = JSON.parse(await doAPIRequest({ port: http }, '/api/instance/2fa/enable', {
		instance_id: instance_id.toHexString(),
		password: hash(pad(userpw, 'masterpwverify')),
		email: DEFAULT_EMAIL
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) return;
	const data = response.data;
	t.falsy((data as {
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
	t.false(finalData.enabled, '2FA was not already enabled');
	if (finalData.enabled) return;
	t.true(finalData.verify_2fa_required, 
		'further verification is needed');
	t.is(typeof finalData.auth_url, 'string', 'auth_url is a string');
	t.regex(finalData.auth_url, 
		/otpauth:\/\/totp\/(.*)\?secret=\w+/,
		'url is an otp auth url');
});
test('can enable 2FA when a 2FA secret is already set', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		instance_twofactor_enabled: false,
		twofactor_secret: speakeasy.generateSecret().base32
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		dbpw,
		instance_id, 
	} = config;
	uris.push(uri);

	const response = JSON.parse(await doAPIRequest({ port: http }, '/api/instance/2fa/enable', {
		instance_id: instance_id.toHexString(),
		password: hash(pad(userpw, 'masterpwverify')),
		email: DEFAULT_EMAIL
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) return;
	const data = response.data;
	t.falsy((data as {
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
	t.true(finalData.enabled, '2FA was already enabled');

	const instance = await doSingleQuery(uri, async (db) => {
		return await db.collection('instances').findOne({
			_id: new mongo.ObjectId(instance_id)
		});
	});
	t.truthy(instance, 'instance exists');
	if (!instance) return;
	const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
	t.not(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	if (decrypt === ERRS.INVALID_DECRYPT) return;
	t.is(decrypt, true, '2FA is now enabled');
});
test('does not change it if 2FA was aleady enabled in this instance', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		instance_twofactor_enabled: true,
		twofactor_secret: speakeasy.generateSecret().base32
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		dbpw,
		instance_id, 
	} = config;
	uris.push(uri);

	const response = JSON.parse(await doAPIRequest({ port: http }, '/api/instance/2fa/enable', {
		instance_id: instance_id.toHexString(),
		password: hash(pad(userpw, 'masterpwverify')),
		email: DEFAULT_EMAIL
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) return;
	const data = response.data;
	t.is((data as {
		message: 'state unchanged (was already set)'
	}).message, 'state unchanged (was already set)', 'state is unchanged');

	const instance = await doSingleQuery(uri, async (db) => {
		return await db.collection('instances').findOne({
			_id: instance_id
		}) as EncryptedInstance;
	});
	t.truthy(instance, 'instance exists');
	if (!instance) return;
	const decrypt = decryptWithSalt(instance.twofactor_enabled, dbpw);
	t.not(decrypt, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	if (decrypt === ERRS.INVALID_DECRYPT) return;
	t.is(decrypt, true, '2FA is still enabled');
});
test('fails if password is wrong', async t => {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	const { http, userpw, uri, instance_id, server_public_key } = config;
	uris.push(uri);

	await testInvalidCredentials(t, {
		route: '/api/instance/2fa/enable',
		port: http,
		encrypted: {},
		unencrypted: {
			instance_id: instance_id.toHexString(),
			email: DEFAULT_EMAIL,
			password: hash(pad(userpw + 'wrongpw', 'masterpwverify')),
		},
		server: server,
		publicKey: server_public_key
	});
});
test('fails if instance id is wrong', async t => {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	const { http, userpw, uri, server_public_key } = config;
	uris.push(uri);

	await testInvalidCredentials(t, {
		route: '/api/instance/2fa/enable',
		port: http,
		encrypted: {},
		unencrypted: {
			instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>,
			email: DEFAULT_EMAIL,
			password: hash(pad(userpw, 'masterpwverify')),
		},
		server: server,
		publicKey: server_public_key
	});
});