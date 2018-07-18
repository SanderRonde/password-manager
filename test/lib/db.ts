import { EncryptedAccount, DecryptedAccount, DatabaseEncrypted, DatabaseEncryptedWithSalt, EncryptedInstance, MongoRecord, EncryptedPassword, TypedObjectID } from '../../app/database/db-types';
import { encrypt, decrypt, decryptWithSalt, hash, pad, ERRS, encryptWithSalt, genRSAKeyPair, Encrypted, EncryptionAlgorithm } from '../../app/lib/crypto';
import { TEST_DB_URI, ENCRYPTION_ALGORITHM, RESET_KEY_LENGTH } from '../../app/lib/constants';
import { getCollectionLength, MockConfig, doesNotThrowAsync } from './util';
import { genRandomString, getDBFromURI, genID } from '../../app/lib/util';
import { GenericTestContext, Context } from 'ava';
import { DEFAULT_EMAIL } from './consts';
import mongo = require('mongodb');

export async function clearDB(uri: string) {
	await doSingleQuery(uri, async (db) => {
		await db.dropDatabase();
	});
}

export async function getDB(uri: string): Promise<{
	db: mongo.Db;
	done: () => void;
}> {
	const instance = await mongo.MongoClient.connect(uri, {
		useNewUrlParser: true
	} as mongo.MongoClientOptions);
	return {
		db: instance.db(getDBFromURI(uri)),
		done: () => {
			instance.close()
		}
	}
}

export async function genDBWithPW(uri: string) {
	return await doSingleQuery(uri, async (db) => {
		const pw = genRandomString(25);
		await db.collection('meta').insertOne({
			type: 'database',
			data: encrypt('decrypted', pw, ENCRYPTION_ALGORITHM)
		});
		return pw;
	});
}

export async function isMongoConnected() {
	return new Promise<boolean>(async (resolve) => {
		const instance = await mongo.MongoClient.connect(TEST_DB_URI, {
			useNewUrlParser: true
		} as mongo.MongoClientOptions).catch((err) => {
			if (err !== null) {
				resolve(false);
			} else {
				resolve(true);
			}
		});
		if (instance) {
			instance.close();
		}
		resolve(true);
	});
}

export async function hasCreatedDBWithPW(pw: string, uri: string): Promise<boolean> {
	const record = await doSingleQuery(uri, async (db) => {
		return await db.collection('meta').findOne({
			type: 'database'
		});
	});

	if (!record) {
		return false;
	}
	const res = decrypt(record.data, pw);
	if (res === 'decrypted') {
		return true;
	}
	return false;
}

function doDbDecrypt<T>(data: EncodedString<DatabaseEncrypted<EncodedString<T>>>, key: string) {
	const res = decrypt(data, key);
	return res;
}

function doDbDecryptWithSalt<T>(data: EncodedString<DatabaseEncryptedWithSalt<T>>, key: string) {
	return decryptWithSalt(data, key);
}

type SuppliedDatabase = mongo.Db|string;

async function getSuppliedDatabase(db: SuppliedDatabase) {
	if (typeof db !== 'string') {
		return {
			db,
			done: () => {}
		}
	}
	return await getDB(db);
}

export async function genAccountOnly(suppliedDb: SuppliedDatabase, {
	dbpw, userpw
}: {
	dbpw: string;
	userpw: string;
}, config: MockConfig = {}): Promise<TypedObjectID<EncryptedAccount>> {
	const { db, done } = await getSuppliedDatabase(suppliedDb);

	const resetKey = genRandomString(RESET_KEY_LENGTH);
	const accountRecords: EncryptedAccount[] = [{
		email: DEFAULT_EMAIL,
		pw: encrypt(hash(pad(userpw, 'masterpwverify')), dbpw, ENCRYPTION_ALGORITHM),
		twofactor_enabled: encryptWithSalt(config.account_twofactor_enabled || false, 
			dbpw, ENCRYPTION_ALGORITHM),
		twofactor_secret: encryptWithSalt(config.twofactor_token || null, 
			dbpw, ENCRYPTION_ALGORITHM),
		reset_key: encrypt(encrypt({
			integrity: true as true,
			pw: userpw
		}, resetKey, ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM),
		reset_reset_keys: []
	}, {
		email: 'other@email.com',
		pw: encrypt(hash(pad('otherpw', 'masterpwverify')), dbpw, ENCRYPTION_ALGORITHM),
		twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
		twofactor_secret: encryptWithSalt(null, dbpw, ENCRYPTION_ALGORITHM),
		reset_key: encrypt(encrypt({
			integrity: true as true,
			pw: userpw
		}, genRandomString(RESET_KEY_LENGTH), 
			ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM),
		reset_reset_keys: []
	}, {
		email: 'other@email.com',
		pw: encrypt(hash(pad('otherpw', 'masterpwverify')), dbpw, ENCRYPTION_ALGORITHM),
		twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
		twofactor_secret: encryptWithSalt(null, dbpw, ENCRYPTION_ALGORITHM),
		reset_key: encrypt(encrypt({
			integrity: true as true,
			pw: userpw
		}, genRandomString(RESET_KEY_LENGTH), 
			ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM),
		reset_reset_keys: []
	}]

	await db.collection('users').insertMany(accountRecords);
	const [{
		_id
	}] = await db.collection('users').find().toArray() as MongoRecord<EncryptedAccount>[];
	done();
	return _id;
}

export async function genInstancesOnly(suppliedDb: SuppliedDatabase, userId: TypedObjectID<EncryptedAccount>, {
	dbpw
}: {
	dbpw: string;
}, {
	instance_public_key,
	server_private_key
}: {
	instance_public_key: string;
	server_private_key: string;
} = {
	instance_public_key: genRSAKeyPair().publicKey,
	server_private_key: genRSAKeyPair().privateKey
}, config: MockConfig = {}) {
	const { db, done } = await getSuppliedDatabase(suppliedDb);

	const id = genID<EncryptedInstance>();
	const firstInstance: MongoRecord<EncryptedInstance> = {
		_id: id,
		twofactor_enabled: encryptWithSalt(config.instance_twofactor_enabled || false, 
			dbpw, ENCRYPTION_ALGORITHM),
		public_key: encrypt(instance_public_key, dbpw, ENCRYPTION_ALGORITHM),
		user_id: userId,
		server_private_key: encrypt(server_private_key, dbpw, ENCRYPTION_ALGORITHM)
	}
	await db.collection('instances').insertOne(firstInstance);

	//Generate some fake instances
	const instanceRecords: EncryptedInstance[] = [{
		twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
		public_key: encrypt(genRandomString(25), dbpw, ENCRYPTION_ALGORITHM),
		user_id: userId,
		server_private_key: encrypt(genRandomString(25), dbpw, ENCRYPTION_ALGORITHM)
	}, {
		twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
		public_key: encrypt(genRandomString(25), dbpw, ENCRYPTION_ALGORITHM),
		user_id: userId,
		server_private_key: encrypt(genRandomString(25), dbpw, ENCRYPTION_ALGORITHM)
	}, {
		twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
		public_key: encrypt(genRandomString(25), dbpw, ENCRYPTION_ALGORITHM),
		user_id: new mongo.ObjectId() as TypedObjectID<EncryptedAccount>,
		server_private_key: encrypt(genRandomString(25), dbpw, ENCRYPTION_ALGORITHM)
	}, {
		twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
		public_key: encrypt(genRandomString(25), dbpw, ENCRYPTION_ALGORITHM),
		user_id: new mongo.ObjectId() as TypedObjectID<EncryptedAccount>,
		server_private_key: encrypt(genRandomString(25), dbpw, ENCRYPTION_ALGORITHM)
	}];
	await db.collection('instances').insertMany(instanceRecords);
	done();
	return id;
}

export async function genPasswordsOnly(suppliedDb: SuppliedDatabase, id: TypedObjectID<EncryptedAccount>, {
	dbpw, userpw
}: {
	dbpw: string;
	userpw: string;
}) {
	const { db, done } = await getSuppliedDatabase(suppliedDb);

	//Generate some fake passwords
	const passwordRecords: EncryptedPassword[] = [{
		user_id: id,
		twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
		websites: [],
		encrypted: encrypt(encrypt({
			username: 'someusername',
			password: 'somepw',
			notes: []
		}, hash(pad(userpw, 'masterpwdecrypt')), 
			ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM)
	}, {
		user_id: id,
		twofactor_enabled: encryptWithSalt(true, dbpw, ENCRYPTION_ALGORITHM),
		websites: [{
			exact: encrypt('someexacturl', dbpw, ENCRYPTION_ALGORITHM),
			host: encrypt('somehost', dbpw, ENCRYPTION_ALGORITHM)
		}],
		encrypted: encrypt(encrypt({
			username: 'someusername',
			password: 'somepw',
			notes: []
		}, hash(pad(userpw, 'masterpwdecrypt')), 
			ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM)
	}, {
		user_id: id,
		twofactor_enabled: encryptWithSalt(true, dbpw, ENCRYPTION_ALGORITHM),
		websites: [],
		encrypted: encrypt(encrypt({
			username: 'someusername',
			password: 'somepw',
			notes: []
		}, hash(pad(userpw, 'masterpwdecrypt')), 
			ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM)
	}, {
		user_id: new mongo.ObjectId() as TypedObjectID<EncryptedAccount>, 
		twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
		websites: [],
		encrypted: encrypt(encrypt({
			username: 'someusername',
			password: 'somepw',
			notes: []
		}, hash(pad(userpw, 'masterpwdecrypt')), 
			ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM)
	}, {
		user_id: new mongo.ObjectId() as TypedObjectID<EncryptedAccount>, 
		twofactor_enabled: encryptWithSalt(true, dbpw, ENCRYPTION_ALGORITHM),
		websites: [{
			exact: encrypt('someexacturl', dbpw, ENCRYPTION_ALGORITHM),
			host: encrypt('somehost', dbpw, ENCRYPTION_ALGORITHM)
		}],
		encrypted: encrypt(encrypt({
			username: 'someusername',
			password: 'somepw',
			notes: []
		}, hash(pad(userpw, 'masterpwdecrypt')), 
			ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM)
	}];

	await db.collection('passwords').insertMany(passwordRecords);
	done();
}

export async function genMockAcount({
	dbpw, uri, userpw
}: {
	uri: string;
	dbpw: string;
	userpw: string;
}) {
	const { db, done } = await getDB(uri);
	const _id = await genAccountOnly(db, {
		dbpw,
		userpw
	});
	await genInstancesOnly(db, _id, {
		dbpw,
	});
	await genPasswordsOnly(db, _id, {
		dbpw, userpw
	});	

	done();
}

export async function hasCreatedAccount(t: GenericTestContext<Context<any>>, {
	dbpw, resetKey, userpw, uri	
}: {
	uri: string;
	dbpw: string;
	userpw: string;
	resetKey: string;
}): Promise<void> {
	t.true(await hasCreatedDBWithPW(dbpw, uri), 'a database has been created');

	const { db, done } = await getDB(uri);

	t.is(await getCollectionLength(db.collection('users')), 1,
		'a single user was created');
	
	//Get record
	const records: EncryptedAccount[] = await db.collection('users').find().toArray();
	t.is(records.length, 1,
		'user record exists');
	
	const [ encrypted ] = records;
	t.truthy(encrypted, 'record is truthy');

	let decrypted = { 
		reset_reset_keys: encrypted.reset_reset_keys as any[],
		email: encrypted.email
	} as Partial<DecryptedAccount> & {
		email: string;
		reset_reset_keys: DatabaseEncrypted<EncodedString<{
			data: Encrypted<EncodedString<{
				data: Encrypted<EncodedString<{
					integrity: true;
				}>, string, "aes-256-ctr">;
				algorithm: EncryptionAlgorithm;
			}>, string, "aes-256-ctr">;
			algorithm: EncryptionAlgorithm;
		}>>[]
	}

	//Decrypt everything
	await Promise.all([
		doesNotThrowAsync(t, async () => {
			const res = await doDbDecrypt(encrypted.pw, dbpw);
			t.not(res, ERRS.INVALID_DECRYPT,
				'decrypting pw does not result in invalid decrypt');
			if (res === ERRS.INVALID_DECRYPT) return;
			decrypted.pw = res;
		}, 'pw can be decrypted'),
		doesNotThrowAsync(t, async () => {
			const res = await doDbDecryptWithSalt(encrypted.twofactor_enabled, dbpw);
			t.not(res, ERRS.INVALID_DECRYPT,
				'decrypting twofactor_enabled does not result in invalid decrypt');
			if (res === ERRS.INVALID_DECRYPT) return;
			decrypted.twofactor_enabled = res;
		}, 'twofactor_enabled can be decrypted'),
		doesNotThrowAsync(t, async () => {
			const res = await doDbDecryptWithSalt(encrypted.twofactor_secret, dbpw);
			t.not(res, ERRS.INVALID_DECRYPT,
				'decrypting twofactor_secret does not result in invalid decrypt');
			if (res === ERRS.INVALID_DECRYPT) return;
			decrypted.twofactor_secret = res;
		}, 'twofactor_secret can be decrypted'),
		doesNotThrowAsync(t, async () => {
			const res = await doDbDecrypt(encrypted.reset_key, dbpw);
			t.not(res, ERRS.INVALID_DECRYPT,
				'decrypting reset_key does not result in invalid decrypt');
			if (res === ERRS.INVALID_DECRYPT) return;
			decrypted.reset_key = res;
		}, 'reset_key can be decrypted'),
	]);
	//Verify everything exists
	t.truthy(decrypted.email, 'email is truthy');
	t.truthy(decrypted.pw, 'pw is truthy');
	t.truthy(decrypted.reset_key, 'reset_key is truthy');

	//Verify types
	t.is(typeof decrypted.email, 'string', 'type of email is string');
	t.is(typeof decrypted.pw, 'string', 'type of password is string');
	t.is(typeof decrypted.twofactor_enabled, 'boolean', 'type of 2FA_enabled is boolean');
	t.is(typeof decrypted.reset_key, 'object', 'type of reset_key is object');
	t.true(Array.isArray(decrypted.reset_reset_keys), 'reset_reset_keys is an array');
	t.is(decrypted.reset_reset_keys.length, 0, 'reset_reset_keys is empty');

	//Verify values
	t.is(decrypted.email, DEFAULT_EMAIL, 'emails match');
	t.is(decrypted.pw, hash(pad(userpw, 'masterpwverify')), 
		'passwords match');
	t.is(decrypted.twofactor_enabled, false, '2FA is disabled by default');
	t.is(decrypted.twofactor_secret, null, 'twofactor secret is not set');

	if (!decrypted.reset_key) {
		return;
	}
	
	const decryptedResetKey: {
		integrity: true;
		pw: string;
	} = await doesNotThrowAsync(t, async () => {
		const res = await decrypt(decrypted.reset_key!, resetKey);
		t.not(res, ERRS.INVALID_DECRYPT,
			'is not an invalid decrypt');
		return res as {
			integrity: true;
			pw: string;
		};
	}, 'reset_key can be decrypted even further');

	t.truthy(decryptedResetKey, 'value was decrypted');
	t.true(decryptedResetKey.integrity, 'integrity is true');
	t.is(decryptedResetKey.pw, userpw, 'decrypted reset key holds password');
	
	done();
}

export async function hasDeletedAccount(t: GenericTestContext<Context<any>>, uri: string) {
	const { db, done } = await getDB(uri);

	t.is(await getCollectionLength(db.collection('users')), 2,
		'remaining users did not get deleted');
	const [ firstAcc, secondAcc ] = await db.collection('users').find().toArray() as 
		EncryptedAccount[];

	t.not(firstAcc.email, DEFAULT_EMAIL,
		'only original account was deleted');
	t.not(secondAcc.email, DEFAULT_EMAIL,
		'only original account was deleted');

	t.is(await getCollectionLength(db.collection('instances')), 2,
		'remaining instances did not get deleted');
	t.is(await getCollectionLength(db.collection('passwords')), 2,
		'remaining passwords did not get deleted');

	done();
}

export async function doSingleQuery<R>(uri: string, callback: (db: mongo.Db) => Promise<R>): Promise<R> {
	const { db, done } = await getDB(uri);
	const retVal = await callback(db);
	done();
	return retVal;
}