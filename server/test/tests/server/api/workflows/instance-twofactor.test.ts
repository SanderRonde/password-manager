import { genRSAKeyPair, hash, pad, decryptWithPrivateKey, ERRS, decryptWithSalt, encryptWithPublicKey } from '../../../../../app/lib/crypto';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest } from '../../../../lib/util';
import { genRandomString } from '../../../../../app/lib/util';
import { DEFAULT_EMAIL } from '../../../../lib/consts';
import { doSingleQuery } from '../../../../lib/db';
import * as querystring from 'querystring'
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import * as url from 'url'
import { test } from 'ava';

const uris = captureURIs(test);
test('can enable 2FA after registering instance when 2FA is enabled for the user', async t => {
	const twofactor = speakeasy.generateSecret();
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: twofactor.base32
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		dbpw
	} = config;
	uris.push(uri);

	const {
		instance_id,
		server_key
	} = await (async  () => {
		const keyPair = genRSAKeyPair();
		const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/register', {
			email: DEFAULT_EMAIL,
			password: hash(pad(userpw, 'masterpwverify')),
			public_key: keyPair.publicKey
		}));

		t.true(response.success, 'API call succeeded');
		if (!response.success) {
			return {};
		}
		const instance_id = decryptWithPrivateKey(response.data.id, keyPair.privateKey);
		const server_key = decryptWithPrivateKey(response.data.server_key, 
			keyPair.privateKey)
		
		t.not(instance_id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		t.not(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		if (instance_id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
			return {};
		}

		const instance = await doSingleQuery(uri, async (db) => {
			return await db.collection('instances').findOne({
				_id: new mongo.ObjectId(instance_id)
			});
		});
		t.truthy(instance, 'instance was created and ID is correct');

		t.is(typeof server_key, 'string', 'type of serverkey is string');
		return {
			instance_id: instance_id,
			server_key: server_key
		}
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_key!
		}, '/api/instance/2fa/enable', {
			instance_id: instance_id!,
			email: DEFAULT_EMAIL
		}, {
			password: hash(pad(userpw, 'masterpwverify')),
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
	})();
});
test('can enable 2FA and then disable it', async t => {
	const twofactor = speakeasy.generateSecret();
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		instance_twofactor_enabled: false,
		twofactor_secret: twofactor.base32
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		dbpw,
		instance_id, 
		server_public_key
	} = config;
	uris.push(uri);

	await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/2fa/enable', {
			instance_id: instance_id.toHexString(),
			email: DEFAULT_EMAIL
		}, {
			password: hash(pad(userpw, 'masterpwverify'))
		}));
		
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
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/2fa/disable', {
			instance_id: instance_id.toHexString(),
			email: DEFAULT_EMAIL,
			twofactor_token: speakeasy.totp({
				secret: twofactor.base32,
				encoding: 'base32'
			})
		}, {
			password: hash(pad(userpw, 'masterpwverify'))
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
			disabled: true;	
		};
		t.true(finalData.disabled, '2FA was disabled');

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
		t.is(decrypt, false, '2FA is now disabled');
	})();
});
test('can enable 2FA, disable 2FA and then enable it', async t => {
	const twofactor = speakeasy.generateSecret();
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		instance_twofactor_enabled: false,
		twofactor_secret: twofactor.base32
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		dbpw,
		instance_id, 
		server_public_key
	} = config;
	uris.push(uri);

	await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/2fa/enable', {
			instance_id: instance_id.toHexString(),
			email: DEFAULT_EMAIL
		}, {
			password: hash(pad(userpw, 'masterpwverify'))
		}));
		
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
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/2fa/disable', {
			instance_id: instance_id.toHexString(),
			email: DEFAULT_EMAIL,
			twofactor_token: speakeasy.totp({
				secret: twofactor.base32,
				encoding: 'base32'
			})
		}, {
			password: hash(pad(userpw, 'masterpwverify'))
		}));

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
			disabled: true;	
		};
		t.true(finalData.disabled, '2FA was disabled');

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
		t.is(decrypt, false, '2FA is now disabled');
	})();
	await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/2fa/enable', {
			instance_id: instance_id.toHexString(),
			email: DEFAULT_EMAIL
		}, {
			password: hash(pad(userpw, 'masterpwverify'))
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
	})();
});
test('can verify a login requiring 2FA', async t => {
	const twofactor = speakeasy.generateSecret();
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		instance_twofactor_enabled: true,
		twofactor_secret: twofactor.base32
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		server_public_key, 
		instance_id, 
		instance_private_key
	} = config;
	uris.push(uri);

	const pw_verification_token = await (async () => {	
		const challenge = genRandomString(25);
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/login', {
			instance_id: instance_id.toHexString(),
			challenge: encryptWithPublicKey(challenge, server_public_key)
		}, {
			password_hash: hash(pad(userpw, 'masterpwverify'))
		}));
		
		t.true(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.true(data.twofactor_required, 'further authentication is required');
		if (data.twofactor_required === false) {
			return;
		}
		const token = decryptWithPrivateKey(data.twofactor_auth_token, instance_private_key);
		t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (token === ERRS.INVALID_DECRYPT) {
			return;
		}
		t.is(typeof token, 'string', 'token is a string');
	
		t.is(data.challenge, challenge, 'challenge matches');
		return token;
	})();
	const authToken = await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/2fa/verify', {
			instance_id: instance_id.toHexString(),
			pw_verification_token: pw_verification_token!,
			twofactor_token: speakeasy.totp({
				secret: twofactor.base32,
				encoding: 'base32'
			})
		}));

		t.true(response.success, 'API call succeeded');
		if (!response.success) return;

		const data = response.data;
		t.is(typeof data.auth_token, 'string', 'auth token is a string');
		const decrypted = decryptWithPrivateKey(data.auth_token, instance_private_key);
		t.not(decrypted, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		if (decrypted === ERRS.INVALID_DECRYPT) return;
		return decrypted;
	})();
	//Check if it's valid by extending the key
	await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/extend_key', {
			instance_id: instance_id.toHexString(),
			oldToken: authToken!,
			count: config.count++
		}));
	
		server.kill();
	
		t.true(response.success, 'API call succeeded')
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.is(typeof data.auth_token, 'string', 'new auth token was passed');
	})();
});
test('can register an instance, enable 2FA, log in with it and disable 2FA', async t => {
	const twofactor = speakeasy.generateSecret();
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true,
		twofactor_secret: twofactor.base32
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		dbpw
	} = config;
	uris.push(uri);

	const {
		instance_id,
		server_public_key,
		instance_private_key
	} = await (async  () => {
		const keyPair = genRSAKeyPair();
		const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/register', {
			email: DEFAULT_EMAIL,
			password: hash(pad(userpw, 'masterpwverify')),
			public_key: keyPair.publicKey
		}));

		t.true(response.success, 'API call succeeded');
		if (!response.success) {
			return {};
		}
		const instance_id = decryptWithPrivateKey(response.data.id, keyPair.privateKey);
		const server_key = decryptWithPrivateKey(response.data.server_key, 
			keyPair.privateKey)
		
		t.not(instance_id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		t.not(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		if (instance_id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
			return {};
		}

		const instance = await doSingleQuery(uri, async (db) => {
			return await db.collection('instances').findOne({
				_id: new mongo.ObjectId(instance_id)
			});
		});
		t.truthy(instance, 'instance was created and ID is correct');

		t.is(typeof server_key, 'string', 'type of serverkey is string');
		return {
			instance_id: instance_id,
			server_public_key: server_key,
			instance_private_key: keyPair.privateKey
		}
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key!
		}, '/api/instance/2fa/enable', {
			instance_id: instance_id!,
			email: DEFAULT_EMAIL
		}, {
			password: hash(pad(userpw, 'masterpwverify'))
		}));
		
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
	})();
	const pw_verification_token = await (async () => {	
		const challenge = genRandomString(25);
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key!
		}, '/api/instance/login', {
			instance_id: instance_id!,
			challenge: encryptWithPublicKey(challenge, server_public_key!)
		}, {
			password_hash: hash(pad(userpw, 'masterpwverify'))
		}));
		
		t.true(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.true(data.twofactor_required, 'further authentication is required');
		if (data.twofactor_required === false) {
			return;
		}
		const token = decryptWithPrivateKey(data.twofactor_auth_token, instance_private_key!);
		t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (token === ERRS.INVALID_DECRYPT) {
			return;
		}
		t.is(typeof token, 'string', 'token is a string');
	
		t.is(data.challenge, challenge, 'challenge matches');
		return token;
	})();
	const authToken = await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key!
		}, '/api/instance/2fa/verify', {
			instance_id: instance_id!,
			pw_verification_token: pw_verification_token!,
			twofactor_token: speakeasy.totp({
				secret: twofactor.base32,
				encoding: 'base32'
			})
		}));

		t.true(response.success, 'API call succeeded');
		if (!response.success) return;

		const data = response.data;
		t.is(typeof data.auth_token, 'string', 'auth token is a string');
		const decrypted = decryptWithPrivateKey(data.auth_token, instance_private_key!);
		t.not(decrypted, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		if (decrypted === ERRS.INVALID_DECRYPT) return;
		return decrypted;
	})();
	//Check if it's valid by extending the key
	await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/extend_key', {
			instance_id: instance_id!,
			oldToken: authToken!,
			count: config.count++
		}));
		config.count = 0;
		
		t.true(response.success, 'API call succeeded')
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.is(typeof data.auth_token, 'string', 'new auth token was passed');
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key!
		}, '/api/instance/2fa/disable', {
			instance_id: instance_id!,
			email: DEFAULT_EMAIL,
			twofactor_token: speakeasy.totp({
				secret: twofactor.base32,
				encoding: 'base32'
			})
		}, {
			password: hash(pad(userpw, 'masterpwverify'))
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
			disabled: true;	
		};
		t.true(finalData.disabled, '2FA was disabled');

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
		t.is(decrypt, false, '2FA is now disabled');
	})();
});

test('can register an instance, enable 2FA for the user and enable 2FA for the instance', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		dbpw
	} = config;
	uris.push(uri);

	const {
		instance_id,
		server_public_key,
		instance_private_key
	} = await (async  () => {
		const keyPair = genRSAKeyPair();
		const response = JSON.parse(await doServerAPIRequest({ port: http }, '/api/instance/register', {
			email: DEFAULT_EMAIL,
			password: hash(pad(userpw, 'masterpwverify')),
			public_key: keyPair.publicKey
		}));

		t.true(response.success, 'API call succeeded');
		if (!response.success) {
			return {};
		}
		const instance_id = decryptWithPrivateKey(response.data.id, keyPair.privateKey);
		const server_key = decryptWithPrivateKey(response.data.server_key, 
			keyPair.privateKey)
		
		t.not(instance_id, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		t.not(server_key, ERRS.INVALID_DECRYPT, 'decryption was not successful');
		if (instance_id === ERRS.INVALID_DECRYPT || server_key === ERRS.INVALID_DECRYPT) {
			return {};
		}

		const instance = await doSingleQuery(uri, async (db) => {
			return await db.collection('instances').findOne({
				_id: new mongo.ObjectId(instance_id)
			});
		});
		t.truthy(instance, 'instance was created and ID is correct');

		t.is(typeof server_key, 'string', 'type of serverkey is string');
		return {
			instance_id: instance_id,
			server_public_key: server_key,
			instance_private_key: keyPair.privateKey
		}
	})();
	const secret = await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key!
		}, '/api/instance/2fa/enable', {
			instance_id: instance_id!,
			email: DEFAULT_EMAIL
		}, {
			password: hash(pad(userpw, 'masterpwverify'))
		}));
		
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
		t.false(finalData.enabled, '2FA was not enabled yet');
		if (finalData.enabled) return;
		const { query } = url.parse(finalData.auth_url);
		const secret = querystring.parse(query!).secret;

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
		t.is(decrypt, false, '2FA is still disabled');

		return secret as string;
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ port: http}, '/api/instance/2fa/confirm', {
			instance_id: instance_id!,
			twofactor_token: speakeasy.totp({
				secret: secret!,
				encoding: 'base32'
			})
		}));

		t.true(response.success, 'API request succeeded');

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
	})();
	const pw_verification_token = await (async () => {
		const challenge = genRandomString(25);
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key!
		}, '/api/instance/login', {
			instance_id: instance_id!,
			challenge: encryptWithPublicKey(challenge, server_public_key!)
		}, {
			password_hash: hash(pad(userpw, 'masterpwverify'))
		}));
		
		t.true(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.true(data.twofactor_required, 'further authentication is required');
		if (data.twofactor_required === false) {
			return;
		}
		const token = decryptWithPrivateKey(data.twofactor_auth_token, instance_private_key!);
		t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (token === ERRS.INVALID_DECRYPT) {
			return;
		}
		t.is(typeof token, 'string', 'token is a string');
	
		t.is(data.challenge, challenge, 'challenge matches');
		return token;
	})();
	const authToken = await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/2fa/verify', {
			instance_id: instance_id!,
			pw_verification_token: pw_verification_token!,
			twofactor_token: speakeasy.totp({
				secret: secret,
				encoding: 'base32'
			})
		}));

		t.true(response.success, 'API call succeeded');
		if (!response.success) return;

		const data = response.data;
		t.is(typeof data.auth_token, 'string', 'auth token is a string');
		const decrypted = decryptWithPrivateKey(data.auth_token, instance_private_key!);
		t.not(decrypted, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		if (decrypted === ERRS.INVALID_DECRYPT) return;
		return decrypted;
	})();
	//Check if it's valid by extending the key
	await (async () => {	
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/instance/extend_key', {
			instance_id: instance_id!,
			oldToken: authToken!,
			count: config.count++
		}));
		config.count = 0;
		
		t.true(response.success, 'API call succeeded')
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.is(typeof data.auth_token, 'string', 'new auth token was passed');
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key!
		}, '/api/instance/2fa/disable', {
			instance_id: instance_id!,
			email: DEFAULT_EMAIL,
			twofactor_token: speakeasy.totp({
				secret: secret,
				encoding: 'base32'
			})
		}, {
			password: hash(pad(userpw, 'masterpwverify'))
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
			disabled: true;	
		};
		t.true(finalData.disabled, '2FA was disabled');

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
		t.is(decrypt, false, '2FA is now disabled');
	})();
});