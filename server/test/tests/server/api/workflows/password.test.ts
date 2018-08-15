import { encryptWithPublicKey, hash, pad, decryptWithPrivateKey, ERRS, encrypt, decryptWithSalt, decrypt } from '../../../../../app/lib/crypto';
import { genUserAndDb, createServer, doServerAPIRequest, captureURIs, genURL, doesNotThrow, isErr } from '../../../../lib/util';
import { genRandomString } from '../../../../../app/lib/util';
import * as url from 'url'
import * as mongo from 'mongodb'
import { assert } from 'chai';
import { ENCRYPTION_ALGORITHM } from '../../../../../app/lib/constants';
import { EncryptedPassword, MongoRecord, EncryptedInstance } from '../../../../../app/../../shared/types/db-types';
import { getDB, doSingleQuery } from '../../../../lib/db';

const uris = captureURIs(test);
test('can log in, set a password, update it and then remove a password', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		server_public_key, 
		instance_id, 
		instance_private_key,
		dbpw
	} = config;
	uris.push(uri);

	const token = await (async () => {
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

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.false(data.twofactor_required, 'further authentication is not required');
		if (data.twofactor_required === true) {
			return;
		}
		const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
		t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (token === ERRS.INVALID_DECRYPT) return;
		t.is(typeof token, 'string', 'token is a string');

		t.is(data.challenge, challenge, 'challenge matches');
		return token;
	})();

	const initialPassword = {
		websites: [genURL(), genURL(), genURL()],
		twofactorEnabled: Math.random() > 0.5,
		encrypted: encrypt({
			username: genRandomString(25),
			password: genRandomString(25),
			notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
		}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM)
	}
	const passwordId = await (async () => {
		const expectedWebsites = initialPassword.websites;
		const expected2FAEnabled = initialPassword.twofactorEnabled;
		const expectedEncrypted = initialPassword.encrypted;
		
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

		assert.isTrue(response.success, 'API call succeeded');
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

		return data.id;
	})();
	const updatedPassword = {
		websites: [genURL(), genURL(), genURL()],
		twofactorEnabled: Math.random() > 0.5,
		encrypted: encrypt({
			username: genRandomString(25),
			password: genRandomString(25),
			notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
		}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM)
	}
	await (async () => {
		const expectedWebsites = updatedPassword.websites;
		const expected2FAEnabled = updatedPassword.twofactorEnabled;
		const expectedEncrypted = updatedPassword.encrypted;
		
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/password/update', {
			instance_id: config.instance_id.toHexString()
		}, {
			token: token!,
			count: config.count++,
			password_id: passwordId!,
			websites: expectedWebsites,
			twofactor_enabled: expected2FAEnabled,
			encrypted: expectedEncrypted
		}));

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		
		//Check if it was actually created
		const { db, done } = await getDB(uri);
		const password = await db.collection('passwords').findOne({
			_id: new mongo.ObjectId(passwordId!)
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
	})();
	await (async () => {
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
	
		assert.isTrue(response.success, 'API call succeeded');
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
	})();
});
test('can log in, set a password, update, and get meta and non-meta data', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		server_public_key, 
		instance_id, 
		instance_private_key,
		dbpw
	} = config;
	uris.push(uri);

	const token = await (async () => {
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

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.false(data.twofactor_required, 'further authentication is not required');
		if (data.twofactor_required === true) {
			return;
		}
		const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
		t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (token === ERRS.INVALID_DECRYPT) return;
		t.is(typeof token, 'string', 'token is a string');

		t.is(data.challenge, challenge, 'challenge matches');
		return token;
	})();

	const initialPassword = {
		websites: [genURL(), genURL(), genURL()],
		twofactorEnabled: Math.random() > 0.5,
		encrypted: encrypt({
			username: genRandomString(25),
			password: genRandomString(25),
			notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
		}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM)
	}
	const passwordId = await (async () => {
		const expectedWebsites = initialPassword.websites;
		const expected2FAEnabled = initialPassword.twofactorEnabled;
		const expectedEncrypted = initialPassword.encrypted;
		
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

		assert.isTrue(response.success, 'API call succeeded');
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

		return data.id;
	})();
	const updatedPassword = {
		websites: [genURL(), genURL(), genURL()],
		twofactorEnabled: Math.random() > 0.5,
		username: genRandomString(25),
		password: genRandomString(25),
		notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
	}
	await (async () => {
		const expectedWebsites = updatedPassword.websites;
		const expected2FAEnabled = updatedPassword.twofactorEnabled;
		const expectedEncrypted = encrypt({
			username: updatedPassword.username,
			password: updatedPassword.password,
			notes: updatedPassword.notes
		}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
		
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/password/update', {
			instance_id: config.instance_id.toHexString()
		}, {
			token: token!,
			count: config.count++,
			password_id: passwordId!,
			websites: expectedWebsites,
			twofactor_enabled: expected2FAEnabled,
			encrypted: expectedEncrypted
		}));

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		
		//Check if it was actually created
		const { db, done } = await getDB(uri);
		const password = await db.collection('passwords').findOne({
			_id: new mongo.ObjectId(passwordId!)
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
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/password/get', {
			instance_id: config.instance_id.toHexString()
		}, {
			token: token!,
			count: config.count++,
			password_id: passwordId!
		}));
		
		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
		t.not(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		if (decryptedData === ERRS.INVALID_DECRYPT) return;
	
		const parsed = doesNotThrow(t, () => {
			return JSON.parse(decryptedData);
		}, 'data can be parsed');
		t.is(parsed.id, passwordId, 'password IDs are the same');
	
		const decryptedEncrypted = decrypt(parsed.encrypted, 
			hash(pad(userpw, 'masterpwdecrypt')));
		if (isErr(t, decryptedEncrypted)) return;
	
		t.is(decryptedEncrypted.username, updatedPassword.username, 'username is the same');
		t.is(decryptedEncrypted.password, updatedPassword.password, 'password is the same');
		for (let i = 0; i < updatedPassword.notes.length; i++) {
			const expectedNote = updatedPassword.notes[i];
			const actualNote = decryptedEncrypted.notes[i];
	
			t.truthy(actualNote, 'note exists');
			t.is(actualNote, expectedNote, 'notes are the same');
		}
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/password/getmeta', {
			instance_id: config.instance_id.toHexString()
		}, {
			token: token!,
			count: config.count++,
			password_id: passwordId!
		}));
	
		server.kill();
	
		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
		t.not(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		if (decryptedData === ERRS.INVALID_DECRYPT) return;
	
		const parsed = doesNotThrow(t, () => {
			return JSON.parse(decryptedData);
		}, 'data can be parsed');
		t.is(parsed.id, passwordId, 'password IDs are the same');
	
		for (let i = 0; i < updatedPassword.websites.length; i++) {
			const expectedNote = updatedPassword.websites[i];
			const actualNote = parsed.websites[i];
	
			t.truthy(actualNote, 'note exists');
			const hostname = url.parse(expectedNote).hostname || 
				url.parse(expectedNote).host || expectedNote
			t.is(actualNote.host, hostname, 'host names match');
			t.is(actualNote.exact, expectedNote, 'exact urls match');
		}
		t.is(parsed.twofactor_enabled, updatedPassword.twofactorEnabled, 'twofactor enabled is the same');
	})();
});
test('can log in, set a password and get all metadata', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer(config);
	const { 
		http, 
		userpw, 
		uri, 
		server_public_key, 
		instance_id, 
		instance_private_key,
		dbpw
	} = config;
	uris.push(uri);

	const token = await (async () => {
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

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		t.false(data.twofactor_required, 'further authentication is not required');
		if (data.twofactor_required === true) {
			return;
		}
		const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
		t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
		if (token === ERRS.INVALID_DECRYPT) return;
		t.is(typeof token, 'string', 'token is a string');

		t.is(data.challenge, challenge, 'challenge matches');
		return token;
	})();

	const initialPassword = {
		websites: [genURL(), genURL(), genURL()],
		twofactorEnabled: Math.random() > 0.5,
		encrypted: encrypt({
			username: genRandomString(25),
			password: genRandomString(25),
			notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
		}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM)
	}
	const passwordId = await (async () => {
		const expectedWebsites = initialPassword.websites;
		const expected2FAEnabled = initialPassword.twofactorEnabled;
		const expectedEncrypted = initialPassword.encrypted;
		
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

		assert.isTrue(response.success, 'API call succeeded');
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

		return data.id;
	})();
	const updatedPassword = {
		websites: [genURL(), genURL(), genURL()],
		twofactorEnabled: Math.random() > 0.5,
		encrypted: encrypt({
			username: genRandomString(25),
			password: genRandomString(25),
			notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
		}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM)
	}
	await (async () => {
		const expectedWebsites = updatedPassword.websites;
		const expected2FAEnabled = updatedPassword.twofactorEnabled;
		const expectedEncrypted = updatedPassword.encrypted;
		
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/password/update', {
			instance_id: config.instance_id.toHexString()
		}, {
			token: token!,
			count: config.count++,
			password_id: passwordId!,
			websites: expectedWebsites,
			twofactor_enabled: expected2FAEnabled,
			encrypted: expectedEncrypted
		}));

		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		
		//Check if it was actually created
		const { db, done } = await getDB(uri);
		const password = await db.collection('passwords').findOne({
			_id: new mongo.ObjectId(passwordId!)
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
	})();
	await (async () => {
		const response = JSON.parse(await doServerAPIRequest({ 
			port: http,
			publicKey: server_public_key
		}, '/api/password/allmeta', {
			instance_id: config.instance_id.toHexString()
		}, {
			token: token!,
			count: config.count++,
			password_hash: hash(pad(userpw, 'masterpwverify'))
		}));
	
		server.kill();
	
		assert.isTrue(response.success, 'API call succeeded');
		if (!response.success) {
			return;
		}
		const data = response.data;
		const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
		t.not(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		if (decryptedData === ERRS.INVALID_DECRYPT) return;
	
		const parsed = doesNotThrow(t, () => {
			return JSON.parse(decryptedData);
		}, 'data can be parsed');
		const expectedPasswords = [updatedPassword];
		const passwordIds = [passwordId];
		t.is(parsed.length, expectedPasswords.length, 'exactly 2 passwords are returned');
		for (let i = 0; i < expectedPasswords.length; i++) {
			const parsedValue = parsed[i];
			const expected = expectedPasswords[i];
			t.is(parsedValue.id, passwordIds[i], 'password IDs are the same');
			for (let i = 0; i < expected.websites.length; i++) {
				const expectedWebsite = expected.websites[i];
				const actualWebsite = parsedValue.websites[i];
		
				t.truthy(actualWebsite, 'note exists');
				const hostname = url.parse(expectedWebsite).hostname || 
					url.parse(expectedWebsite).host || expectedWebsite
				t.is(actualWebsite.host, hostname, 'host names match');
				t.is(actualWebsite.exact, expectedWebsite, 'exact urls match');
			}
			t.is(parsedValue.twofactor_enabled, expected.twofactorEnabled, 'twofactor enabled is the same');
		}
	})();
});
test('can log in, set and update a password, ' + 
	'call querymeta and get metadata for given query result', async t => {
		const config = await genUserAndDb(t, {
			account_twofactor_enabled: false
		});
		const server = await createServer(config);
		const { 
			http, 
			userpw, 
			uri, 
			server_public_key, 
			instance_id, 
			instance_private_key,
			dbpw
		} = config;
		uris.push(uri);

		const token = await (async () => {
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

			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) {
				return;
			}
			const data = response.data;
			t.false(data.twofactor_required, 'further authentication is not required');
			if (data.twofactor_required === true) {
				return;
			}
			const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
			t.not(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
			if (token === ERRS.INVALID_DECRYPT) return;
			t.is(typeof token, 'string', 'token is a string');

			t.is(data.challenge, challenge, 'challenge matches');
			return token;
		})();

		const matchingHost = `www.${genRandomString(20)}.${genRandomString(3)}`;
		const initialPassword = {
			websites: [genURL(), genURL(), genURL()],
			twofactorEnabled: Math.random() > 0.5,
			encrypted: encrypt({
				username: genRandomString(25),
				password: genRandomString(25),
				notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
			}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM)
		}
		const passwordId = await (async () => {
			const expectedWebsites = initialPassword.websites;
			const expected2FAEnabled = initialPassword.twofactorEnabled;
			const expectedEncrypted = initialPassword.encrypted;
			
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

			assert.isTrue(response.success, 'API call succeeded');
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

			return data.id;
		})();
		const updatedPassword = {
			websites: [genURL(), genURL(matchingHost), genURL()],
			twofactorEnabled: Math.random() > 0.5,
			username: genRandomString(25),
			password: genRandomString(25),
			notes: [genRandomString(10), genRandomString(20), genRandomString(30)]
		}
		await (async () => {
			const expectedWebsites = updatedPassword.websites;
			const expected2FAEnabled = updatedPassword.twofactorEnabled;
			const expectedEncrypted = encrypt({
				username: updatedPassword.username,
				password: updatedPassword.password,
				notes: updatedPassword.notes
			}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
			
			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/update', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: token!,
				count: config.count++,
				password_id: passwordId!,
				websites: expectedWebsites,
				twofactor_enabled: expected2FAEnabled,
				encrypted: expectedEncrypted
			}));

			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) {
				return;
			}
			
			//Check if it was actually created
			const { db, done } = await getDB(uri);
			const password = await db.collection('passwords').findOne({
				_id: new mongo.ObjectId(passwordId!)
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
		})();
		await (async () => {
			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/allmeta', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: token!,
				count: config.count++,
				password_hash: hash(pad(userpw, 'masterpwverify'))
			}));
				
			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) {
				return;
			}
			const data = response.data;
			const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
			t.not(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			if (decryptedData === ERRS.INVALID_DECRYPT) return;
		
			const parsed = doesNotThrow(t, () => {
				return JSON.parse(decryptedData);
			}, 'data can be parsed');
			const expectedPasswords = [updatedPassword];
			const passwordIds = [passwordId];
			t.is(parsed.length, expectedPasswords.length, 'exactly 2 passwords are returned');
			for (let i = 0; i < expectedPasswords.length; i++) {
				const parsedValue = parsed[i];
				const expected = expectedPasswords[i];
				t.is(parsedValue.id, passwordIds[i], 'password IDs are the same');
				for (let i = 0; i < expected.websites.length; i++) {
					const expectedWebsite = expected.websites[i];
					const actualWebsite = parsedValue.websites[i];
			
					t.truthy(actualWebsite, 'note exists');
					const hostname = url.parse(expectedWebsite).hostname || 
						url.parse(expectedWebsite).host || expectedWebsite
					t.is(actualWebsite.host, hostname, 'host names match');
					t.is(actualWebsite.exact, expectedWebsite, 'exact urls match');
				}
				t.is(parsedValue.twofactor_enabled, expected.twofactorEnabled, 'twofactor enabled is the same');
			}
		})();
		const queryResults = await (async () => {
			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/querymeta', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: token!,
				count: config.count++,
				url: `http${
					Math.random() > 0.5 ? 's' : ''
				}://${
					matchingHost
				}/some/path/to/something.html`
			}));
			
			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) {
				return;
			}
			const data = response.data;
			const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
			t.not(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			if (decryptedData === ERRS.INVALID_DECRYPT) return;
		
			const parsed = doesNotThrow(t, () => {
				return JSON.parse(decryptedData);
			}, 'data can be parsed').sort((a, b) => {
				if (a.id < b.id) return -1;
				if (a.id > b.id) return 1;
				return 0;
			});
			
			const expectedPasswords = [{...updatedPassword, index: 0}];
			const passwordIds = [passwordId];
			const matchingExpectedPasswords = expectedPasswords.filter((password) => {
				for (const website of password.websites) {
					if (website.indexOf(matchingHost) > -1) {
						return true;
					}
				}
				return false;
			});
			t.is(parsed.length, matchingExpectedPasswords.length, 
				'amount of matches match');
		
			for (let i = 0; i < matchingExpectedPasswords.length; i++) {
				const expected = matchingExpectedPasswords[i];
				const actual = parsed[i];
		
				t.is(actual.id, passwordIds[expected.index], 'ids match');
				t.is(actual.twofactor_enabled, expected.twofactorEnabled);
				for (let i = 0; i < expected.websites.length; i++) {
					const expectedWebsite = expected.websites[i];
					const actualWebsite = actual.websites[i];
			
					t.truthy(actualWebsite, 'note exists');
					const hostname = url.parse(expectedWebsite).hostname || 
						url.parse(expectedWebsite).host || expectedWebsite
					t.is(actualWebsite.host, hostname, 'host names match');
					t.is(actualWebsite.exact, expectedWebsite, 'exact urls match');
				}
			}

			return parsed;
		})();
		await (async () => {
			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/get', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: token!,
				count: config.count++,
				password_id: queryResults![0].id
			}));
		
			server.kill();
		
			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) {
				return;
			}
			const data = response.data;
			const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
			t.not(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			if (decryptedData === ERRS.INVALID_DECRYPT) return;
		
			const parsed = doesNotThrow(t, () => {
				return JSON.parse(decryptedData);
			}, 'data can be parsed');
			t.is(parsed.id, passwordId, 'password IDs are the same');
		
			const decryptedEncrypted = decrypt(parsed.encrypted, 
				hash(pad(userpw, 'masterpwdecrypt')));
			if (isErr(t, decryptedEncrypted)) return;
		
			t.is(decryptedEncrypted.username, updatedPassword.username, 'username is the same');
			t.is(decryptedEncrypted.password, updatedPassword.password, 'password is the same');
			for (let i = 0; i < updatedPassword.notes.length; i++) {
				const expectedNote = updatedPassword.notes[i];
				const actualNote = decryptedEncrypted.notes[i];
		
				t.truthy(actualNote, 'note exists');
				t.is(actualNote, expectedNote, 'notes are the same');
			}
		})();
	});