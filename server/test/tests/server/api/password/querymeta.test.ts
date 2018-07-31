import { captureURIs, genUserAndDb, createServer, getLoginToken, setPasword, doServerAPIRequest, genURL, doesNotThrow } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance } from '../../../../../app/database/db-types';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { decryptWithPrivateKey, ERRS } from '../../../../../app/lib/crypto';
import { genRandomString } from '../../../../../app/lib/util';
import { API_ERRS } from '../../../../../app/api';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { test } from 'ava';
import * as url from 'url'

const uris = captureURIs(test);
testParams(test, uris, '/api/password/querymeta', {
	instance_id: 'string'
}, {}, {
	count: 'number',
	token: 'string',
	url: 'string'
}, {});
test('can query a URL', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: true
	});
	const server = await createServer(config);
	const { http, uri, server_public_key, instance_private_key } = config;
	uris.push(uri);

	const token = await getLoginToken(t, config);

	const matchingHost = `www.${genRandomString(20)}.${genRandomString(3)}`;
	const expectedPasswords = [{
		websites: [genURL(matchingHost), genURL()],
		username: genRandomString(20),
		password: genRandomString(20),
		notes: [genRandomString(10), genRandomString(10), genRandomString(10)],
		twofactorEnabled: false
	}, {
		websites: [genURL(), genURL()],
		username: genRandomString(20),
		password: genRandomString(20),
		notes: [genRandomString(10), genRandomString(10), genRandomString(10)],
		twofactorEnabled: true
	}, {
		websites: [genURL(), genURL(matchingHost)],
		username: genRandomString(20),
		password: genRandomString(20),
		notes: [genRandomString(10), genRandomString(10), genRandomString(10)],
		twofactorEnabled: true
	}, {
		websites: [genURL(matchingHost), genURL(matchingHost)],
		username: genRandomString(20),
		password: genRandomString(20),
		notes: [genRandomString(10), genRandomString(10), genRandomString(10)],
		twofactorEnabled: true
	}].map((val, index) => {
		return {...val, index };
	});
	const passwordIds = [];
	for (const pw of expectedPasswords) {
		passwordIds.push(await setPasword(t, {
			websites: pw.websites,
			twofactor_enabled: pw.twofactorEnabled,
			notes: pw.notes,
			username: pw.username,
			password: pw.password
		}, token!, config));
	}

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

	server.kill();

	t.true(response.success, 'API call succeeded');
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

	await testInvalidCredentials(t, {
		route: '/api/password/querymeta',
		port: http,
		unencrypted: {
			instance_id: config.instance_id.toHexString()
		},
		encrypted: {
			count: config.count++,
			token: 'wrongtoken',
			url: genURL()
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
	await testInvalidCredentials(t, {
		route: '/api/password/querymeta',
		port: http,
		unencrypted: {
			instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
		},
		encrypted: {
			count: config.count++,
			token: token!,
			url: genURL()
		},
		server: server,
		publicKey: server_public_key,
		err: API_ERRS.MISSING_PARAMS
	});
});