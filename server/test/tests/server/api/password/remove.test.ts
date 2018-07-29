import { captureURIs, genUserAndDb, createServer, getLoginToken, setPasword, doServerAPIRequest } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance, EncryptedPassword } from '../../../../../app/database/db-types';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { doSingleQuery } from '../../../../lib/db';
import { API_ERRS } from '../../../../../app/api';
import speakeasy = require('speakeasy');
import mongo = require('mongodb');
import { test } from 'ava';

const uris = captureURIs(test);
testParams(test, uris, '/api/password/remove', {
	instance_id: 'string'
}, {}, {
	count: 'number',
	token: 'string',
	password_id: 'string',
}, {
	twofactor_token: 'string'
});
test('can be removed if 2FA is disabled', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const passwordId = await setPasword(t, {
		websites: [],
		twofactor_enabled: false,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/remove', {
		instance_id: config.instance_id.toHexString()
	}, {
		token: token!,
		count: config.count++,
		password_id: passwordId!
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	
	//Check if the password is gone
	const password = await doSingleQuery(uri, async (db) => {
		return db.collection('passwords').findOne({
			_id: new mongo.ObjectId(passwordId!)
		});
	});
	t.is(password, null, 'password is gone');
});
test('fails if 2FA is enabled but no 2FA token is passed', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const passwordId = await setPasword(t, {
		websites: [],
		twofactor_enabled: true,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/remove', {
		instance_id: config.instance_id.toHexString()
	}, {
		token: token!,
		count: config.count++,
		password_id: passwordId!
	}));

	server.kill();

	t.false(response.success, 'API call failed');
	if (response.success) {
		return;
	}
	t.is(response.ERR, API_ERRS.INVALID_CREDENTIALS,
		'invalid credentials error was thrown');
	
	//Check if the password is gone
	const password = await doSingleQuery(uri, async (db) => {
		return db.collection('passwords').findOne({
			_id: new mongo.ObjectId(passwordId!)
		});
	});
	t.not(password, null, 'password is still there');
});
test('can be removed if 2FA is enabled', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const passwordId = await setPasword(t, {
		websites: [],
		twofactor_enabled: false,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/remove', {
		instance_id: config.instance_id.toHexString()
	}, {
		token: token!,
		count: config.count++,
		password_id: passwordId!,
		twofactor_token: speakeasy.totp({
			secret: secret.base32,
			encoding: 'base32'
		})
	}));

	server.kill();

	t.true(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	
	//Check if the password is gone
	const password = await doSingleQuery(uri, async (db) => {
		return db.collection('passwords').findOne({
			_id: new mongo.ObjectId(passwordId!)
		});
	});
	t.is(password, null, 'password is gone');
});
test('fails if auth token is wrong', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);
	const passwordId = await setPasword(t, {
		websites: [],
		twofactor_enabled: false,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	await testInvalidCredentials(t, {
		route: '/api/password/remove',
		port: http,
		unencrypted: {
			instance_id: config.instance_id.toHexString()
		},
		encrypted: {
			count: config.count++,
			token: 'wrongtoken',
			password_id: passwordId!
		},
		server: server,
		publicKey: server_public_key
	});
});
test('fails if instance id is wrong', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);
	const passwordId = await setPasword(t, {
		websites: [],
		twofactor_enabled: false,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	await testInvalidCredentials(t, {
		route: '/api/password/remove',
		port: http,
		unencrypted: {
			instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
		},
		encrypted: {
			count: config.count++,
			token: token!,
			password_id: passwordId!
		},
		server: server,
		publicKey: server_public_key,
		err: API_ERRS.MISSING_PARAMS
	});
});
test('fails if password id is wrong', async t => {
	const secret = speakeasy.generateSecret({
		name: 'Password manager server'
	});
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: secret.base32
	});
	const server = await createServer(config);
	const { http, uri, server_public_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);
	await setPasword(t, {
		websites: [],
		twofactor_enabled: false,
		username: 'username',
		password: 'password',
		notes: []		
	}, token!, config);

	await testInvalidCredentials(t, {
		route: '/api/password/remove',
		port: http,
		unencrypted: {
			instance_id: config.instance_id.toHexString()
		},
		encrypted: {
			count: config.count++,
			token: token!,
			password_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedPassword>
		},
		server: server,
		publicKey: server_public_key
	});
});