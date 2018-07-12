import { TEST_DB_URI, ENCRYPTION_ALGORITHM } from '../../app/lib/constants';
import { genRandomString, getDBFromURI } from '../../app/lib/util';
import { encrypt, decrypt } from '../../app/lib/crypto';
import mongo = require('mongodb');

export async function clearDB(uri: string) {
	const { db, done } = await getDB(uri);
	await db.dropDatabase();
	done();
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
	const { db, done } = await getDB(uri);
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

export async function hasCreatedDBWithPW(pw: string, uri: string): Promise<boolean> {
	const { db, done } = await getDB(uri);

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