const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { captureURIs, genUserAndDb, createServer, getLoginToken, setPasword, doServerAPIRequest, genURL, doesNotThrow } from '../../../../lib/util';
import { StringifiedObjectId, EncryptedInstance } from '../../../../../app/../../../shared/types/db-types';
import { decryptWithPrivateKey, ERRS } from '../../../../../../app/lib/crypto';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { API_ERRS } from '../../../../../app/../../../shared/types/api';
import { genRandomString } from '../../../../../../app/lib/util';
import * as speakeasy from 'speakeasy'
import * as mongo from 'mongodb'
import { assert } from 'chai';
import * as url from 'url'

export function passwordQueryMetaTest() {
	parallel('Querymeta', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/password/querymeta', {
			instance_id: 'string'
		}, {}, {
			count: 'number',
			token: 'string',
			url: 'string'
		}, {});
		it('can query a URL', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: true
			});
			const server = await createServer(config);
			const { http, uri, server_public_key, instance_private_key } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;

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
				passwordIds.push(await setPasword({
					websites: pw.websites,
					twofactor_enabled: pw.twofactorEnabled,
					notes: pw.notes,
					username: pw.username,
					password: pw.password
				}, token, count++, config));
			}

			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/password/querymeta', {
				instance_id: config.instance_id.toHexString()
			}, {
				token: token!,
				count: count++,
				url: `http${
					Math.random() > 0.5 ? 's' : ''
				}://${
					matchingHost
				}/some/path/to/something.html`
			}));

			server.kill();

			assert.isTrue(response.success, 'API call succeeded');
			if (!response.success) {
				return;
			}
			const data = response.data;
			const decryptedData = decryptWithPrivateKey(data.encrypted, instance_private_key);
			assert.notStrictEqual(decryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			if (decryptedData === ERRS.INVALID_DECRYPT) return;

			const parsed = doesNotThrow(() => {
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
			assert.strictEqual(parsed.length, matchingExpectedPasswords.length, 
				'amount of matches match');

			for (let i = 0; i < matchingExpectedPasswords.length; i++) {
				const expected = matchingExpectedPasswords[i];
				const actual = parsed[i];

				assert.strictEqual(actual.id, passwordIds[expected.index], 'ids match');
				assert.strictEqual(actual.twofactor_enabled, expected.twofactorEnabled);
				for (let i = 0; i < expected.websites.length; i++) {
					const expectedWebsite = expected.websites[i];
					const actualWebsite = actual.websites[i];
			
					assert.isTrue(!!actualWebsite, 'note exists');
					const hostname = url.parse(expectedWebsite).hostname || 
						url.parse(expectedWebsite).host || expectedWebsite
					assert.strictEqual(actualWebsite.host, hostname, 'host names match');
					assert.strictEqual(actualWebsite.exact, expectedWebsite, 'exact urls match');
				}
			}
		});
		it('fails if auth token is wrong', async () => {
			const secret = speakeasy.generateSecret({
				name: 'Password manager server',
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: secret.ascii
			});
			const server = await createServer(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/password/querymeta',
				port: http,
				unencrypted: {
					instance_id: config.instance_id.toHexString()
				},
				encrypted: {
					count: 0,
					token: 'wrongtoken',
					url: genURL()
				},
				server: server,
				publicKey: server_public_key
			});
		});
		it('fails if instance id is wrong', async () => {
			const secret = speakeasy.generateSecret({
				name: 'Password manager server',
				length: 64
			});
			const config = await genUserAndDb({
				account_twofactor_enabled: true,
				twofactor_secret: secret.ascii
			});
			const server = await createServer(config);
			const { http, uri, server_public_key } = config;
			uris.push(uri);

			let { token, count } = (await getLoginToken(config))!;
			await testInvalidCredentials({
				route: '/api/password/querymeta',
				port: http,
				unencrypted: {
					instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
				},
				encrypted: {
					count: count++,
					token: token!,
					url: genURL()
				},
				server: server,
				publicKey: server_public_key,
				err: API_ERRS.INVALID_CREDENTIALS
			});
		});
	});
}