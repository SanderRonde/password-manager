import { GenericTestContext, Context, RegisterContextual } from "ava";
import { TEST_DB_URI } from "../../app/lib/constants";
import { genRandomString } from "../../app/lib/util";
import { MainExports } from "../../app/main";
import importFresh = require('import-fresh');
import { EventEmitter } from "events";
import { getDB, clearDB } from "./db";
import { Readable } from "stream";

export function getFreshMain(): MainExports {
	return importFresh('../../app/main');
}

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

export function captureURIs(t: RegisterContextual<any>): string[] {
	const arr: string[] = [];
	t.after('Clear databases', async () => {
		await Promise.all(arr.map(clearDB));
	});
	return arr;
}