import { TEST_DB_URI, ENCRYPTION_ALGORITHM } from '../../app/lib/constants';
import { genRandomString, getDBFromURI } from '../../app/lib/util';
import { encrypt, decrypt } from '../../app/lib/crypto';
import mongo = require('mongodb');

export async function clearDB() {
	const { db, done } = await getDB();
	await db.dropDatabase();
	done();
}

export async function getDB(): Promise<{
	db: mongo.Db;
	done: () => void;
}> {
	const instance = await mongo.MongoClient.connect(TEST_DB_URI, {
		useNewUrlParser: true
	} as mongo.MongoClientOptions);
	return {
		db: instance.db(getDBFromURI(TEST_DB_URI)),
		done: () => {
			instance.close()
		}
	}
}

export async function genDBWithPW() {
	const { db, done } = await getDB();
	const pw = genRandomString(25);
	await db.collection('meta').insertOne({
		type: 'database',
		data: encrypt('decrypted', pw, ENCRYPTION_ALGORITHM)
	});
	done();
	return pw;
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

export async function hasCreatedDBWithPW(pw: string): Promise<boolean> {
	const { db, done } = await getDB();

	const record = await db.collection('meta').findOne({
		type: 'database'
	});
	done();

	const res = decrypt(record.data, pw);
	if (res === 'decrypted') {
		return true;
	}
	return false;
}