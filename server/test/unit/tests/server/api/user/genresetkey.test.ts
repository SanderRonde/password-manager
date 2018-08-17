const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { EncryptedAccount, MongoRecord, EncryptedInstance, StringifiedObjectId } from '../../../../../app/../../shared/types/db-types';
import { captureURIs, genUserAndDb, createServer, doServerAPIRequest } from '../../../../lib/util';
import { testParams, testInvalidCredentials } from '../../../../lib/macros';
import { RESET_KEY_LENGTH } from '../../../../../app/lib/constants';
import { genRandomString } from '../../../../../app/lib/util';
import { decrypt, ERRS } from '../../../../../app/lib/crypto';
import { API_ERRS } from '../../../../../app/../../shared/types/api';
import { getDB } from '../../../../lib/db';
import * as mongo from 'mongodb'
import { assert } from 'chai';

export function userGenResetKeyTest() {
	parallel('Gen Resetkey', () => {
		const uris = captureURIs();
		testParams(it, uris, '/api/user/genresetkey', {
			instance_id: 'string',
		}, {}, {
			reset_key: 'string',
			master_password: 'string'
		}, {});
		it('fails if instance id is wrong', async () => {
			const resetKey = genRandomString(RESET_KEY_LENGTH);
			const config = await genUserAndDb({
				resetKey
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				server_public_key
			} = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/user/genresetkey',
				port: http,
				unencrypted: {
					instance_id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedInstance>
				},
				encrypted: {
					reset_key: resetKey,
					master_password: 'masterpassword'
				},
				server: server,
				publicKey: server_public_key,
				err: API_ERRS.MISSING_PARAMS
			});
		});
		it('rejects if password is wrong', async () => {
			const resetKey = genRandomString(RESET_KEY_LENGTH);
			const config = await genUserAndDb({
				resetKey
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				server_public_key,
				instance_id
			} = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/user/genresetkey',
				port: http,
				unencrypted: {
					instance_id: instance_id.toHexString()
				},
				encrypted: {
					reset_key: resetKey,
					master_password: 'wrongpassword'
				},
				server: server,
				publicKey: server_public_key
			});
		});
		it('rejects if reset key is wrong', async () => {
			const resetKey = genRandomString(RESET_KEY_LENGTH);
			const config = await genUserAndDb({
				resetKey
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				server_public_key,
				instance_id,
				userpw
			} = config;
			uris.push(uri);

			await testInvalidCredentials({
				route: '/api/user/genresetkey',
				port: http,
				unencrypted: {
					instance_id: instance_id.toHexString()
				},
				encrypted: {
					reset_key: genRandomString(RESET_KEY_LENGTH),
					master_password: userpw
				},
				server: server,
				publicKey: server_public_key
			});
		});
		it('works if params are correct', async () => {
			const resetKey = genRandomString(RESET_KEY_LENGTH);
			const config = await genUserAndDb({
				resetKey
			});
			const server = await createServer(config);
			const { 
				http, 
				uri, 
				server_public_key,
				instance_id,
				userpw,
				dbpw
			} = config;
			uris.push(uri);

			const response = JSON.parse(await doServerAPIRequest({ 
				port: http,
				publicKey: server_public_key
			}, '/api/user/genresetkey', {
				instance_id: instance_id.toHexString()
			}, {
				reset_key: resetKey,
				master_password: userpw
			}));

			server.kill();

			assert.isTrue(response.success, 'request succeeded');
			if (response.success === false) return;
			
			const data = response.data;
			assert.strictEqual(typeof data.new_reset_key, 'string', 'reset key is a string');

			const { db, done } = await getDB(uri);
			const instance = await db.collection('instances').findOne({
				_id: instance_id
			}) as MongoRecord<EncryptedInstance>;
			const { reset_key } = await db.collection('users').findOne({
				_id: instance.user_id
			}) as MongoRecord<EncryptedAccount>;
			const dbDecryptedResetKey = decrypt(reset_key, dbpw);
			done();

			assert.notStrictEqual(dbDecryptedResetKey, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			if (dbDecryptedResetKey === ERRS.INVALID_DECRYPT) return;

			const decryptedResetKey = decrypt(dbDecryptedResetKey, data.new_reset_key);
			assert.notStrictEqual(decryptedResetKey, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
			if (decryptedResetKey === ERRS.INVALID_DECRYPT) return;

			assert.isTrue(decryptedResetKey.integrity, 'integrity is preserved');
			assert.strictEqual(decryptedResetKey.pw, userpw, 'passwords match');
		});
	});
}