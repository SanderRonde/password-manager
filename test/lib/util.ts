import { GenericTestContext, Context, RegisterContextual } from "ava";
import { TEST_DB_URI } from "../../app/lib/constants";
import { genRandomString } from "../../app/lib/util";
import { EventEmitter } from "events";
import { getDB, clearDB } from "./db";
import { Readable } from "stream";
import mongo = require('mongodb');
import fs = require('fs');

export function unref(...emitters: (EventEmitter|{
	unref(): void;
})[]) {
	for (const emitter of emitters) {
		(emitter as any).unref &&
			(emitter as any).unref();
	}
}

export function listenWithoutRef(src: Readable, handler: (chunk: string) => void) {
	src.on('data', (chunk) => {
		handler(chunk.toString());
	});
	unref(src);
}

export async function genTempDatabase(t: GenericTestContext<Context<any>>): Promise<string> {
	const suffix = genRandomString(25);

	const uri = `${TEST_DB_URI}${suffix}`;
	const { db, done } = await getDB(uri);
	if (await db.collection('meta').findOne({
		type: '__test'
	})) {
		//Collission, create a new one
		done();
		return await genTempDatabase(t);
	}

	await db.collection('meta').insertOne({
		type: '__test'
	});

	return uri;
}

export function captureCreatedFiles(t: RegisterContextual<any>): string[] {
	const arr: string[] = [];
	t.after('Deete files', async () => {
		await Promise.all(arr.map((filepath) => {
			return new Promise((resolve, reject) => {
				fs.unlink(filepath, (err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				})
			});
		}));
	});
	return arr;
}

export function captureURIs(t: RegisterContextual<any>): string[] {
	const arr: string[] = [];
	t.after('Clear databases', async () => {
		await Promise.all(arr.map(clearDB));
	});
	return arr;
}

export async function getCollectionLength(collection: mongo.Collection) {
	return await (collection as any).countDocuments();
}