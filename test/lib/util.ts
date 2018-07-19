import { getDB, clearDB, genDBWithPW, genAccountOnly, genInstancesOnly } from "./db";
import { EncryptedInstance, TypedObjectID } from "../../app/database/db-types";
import { encryptWithPublicKey, genRSAKeyPair, ERRS } from "../../app/lib/crypto";
import { GenericTestContext, Context, RegisterContextual } from "ava";
import { APIFns, APIArgs, APIReturns } from "../../app/api";
import { TEST_DB_URI } from "../../app/lib/constants";
import { genRandomString } from "../../app/lib/util";
import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { Readable } from "stream";
import mongo = require('mongodb');
import fs = require('fs-extra');
import path = require('path');
import http = require('http');
import net = require('net');

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
	t.after.always('Delete files', async () => {
		await Promise.all(arr.map(async (filepath) => {
			await fs.unlink(filepath).catch(() => {});
		}));
	});
	return arr;
}

export function captureURIs(t: RegisterContextual<any>): string[] {
	const arr: string[] = [];
	t.after.always('Clear databases', async () => {
		await Promise.all(arr.map(clearDB));
	});
	return arr;
}

export async function getCollectionLength(collection: mongo.Collection) {
	return await (collection as any).countDocuments();
}

const usedPorts: number[] = [];
export function getFreePort(startRange: number, endRange: number): Promise<number> {
	return new Promise((resolve) => {
		const port = startRange + Math.floor(Math.random() * (endRange - startRange));
		const server = net.createServer();
		server.unref();
		server.on('error', async () => {
			resolve(await getFreePort(startRange, endRange));
		});
		server.listen(port, () => {
			server.close(() => {
				usedPorts.push(port);
				resolve(port);
			});
		});
	});
}

export interface UserAndDbData {
	instance_id: TypedObjectID<EncryptedInstance>;
	instance_private_key: string;
	server_public_key: string;
	userpw: string;
	http: number;
	dbpw: string;
	uri: string;
	logServerOutput?: boolean;
}

export interface MockConfig {
	resetKey?: string;
	twofactor_token?: string;
	account_twofactor_enabled?: boolean;
	instance_twofactor_enabled?: boolean;
}

export async function genUserAndDb(t: GenericTestContext<Context<any>>, 
	config: MockConfig = {}): Promise<UserAndDbData> {
		const uri = await genTempDatabase(t);
		const userpw = genRandomString(25);

		const dbpw = await genDBWithPW(uri);
		const id = await genAccountOnly(uri, {
			dbpw,
			userpw
	}, config);
		const serverKeyPair = genRSAKeyPair();
		const instanceKeyPair = genRSAKeyPair();
		const instanceId = await genInstancesOnly(uri, id, {
			dbpw
		}, {
			instance_public_key: instanceKeyPair.publicKey,
			server_private_key: serverKeyPair.privateKey
		}, config);
		return {
			instance_private_key: instanceKeyPair.privateKey,
			server_public_key: serverKeyPair.publicKey,
			instance_id: instanceId,
			userpw,
			dbpw,
			uri,
			http: await getFreePort(30000, 50000),
		}
	}

export function createServer({ 
	uri, 
	http, 
	dbpw,
	logServerOutput
}: UserAndDbData, env?: {}): Promise<ChildProcess> {
	return new Promise((resolve) => {
		const proc = spawn('node', [...[
			path.join(__dirname, './../../app/main.js'),
			'server',
			'--http', http + '',
			'--no-rate-limit',
			'-p', dbpw,
			'-d', uri
		], ...(env ? ['--debug'] : [])], {
			env: env || {}
		});
		proc.unref();
		listenWithoutRef(proc.stdout, (chunk) => {
			if (chunk.trim() === `HTTP server listening on port ${http}`) {
				resolve(proc);
			} else if (logServerOutput) {
				console.log(chunk.toString());
			}
		});
	});
}

export async function doAPIRequest<K extends keyof APIFns>({ port, publicKey }: {
	port: number;
	publicKey: string;
}, path: K,args: APIArgs[K][0], encrypted: APIArgs[K][1]): Promise<EncodedString<APIReturns[K]>>;
export async function doAPIRequest<K extends keyof APIFns>({ port }: {
	port: number;
	publicKey?: string;
}, path: K,args: APIArgs[K][0]): Promise<EncodedString<APIReturns[K]>>;
export async function doAPIRequest<K extends keyof APIFns>({ port, publicKey }: {
	port: number;
	publicKey?: string;
}, path: K,args: APIArgs[K][0], encrypted?: APIArgs[K][1]): Promise<EncodedString<APIReturns[K]>> {
	return new Promise<EncodedString<APIReturns[K]>>((resolve, reject) => {
		const keys = Object.getOwnPropertyNames(encrypted || {});
		if (keys.length && !publicKey) {
			throw new Error('Missing public key for encryption');
		}
		const data = JSON.stringify({...args as Object, ...(keys.length && publicKey ? {
			encrypted: encryptWithPublicKey(encrypted, publicKey)
		} : {})});
		const req = http.request({
			port,
			hostname: '127.0.0.1',
			method: 'POST',
			path,
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(data)
			}
		}, (res) => {
			let responseText: string = '';
			res.setEncoding('utf8');
			listenWithoutRef(res, (chunk) => {
				responseText += chunk;
			});
			res.once('end', () => {
				resolve(responseText as EncodedString<APIReturns[K]>);
			});
			res.once('error', (err) => {
				reject(err);
			});
		});
		req.write(data);
		req.end();
	});
}

export function doesNotThrowAsync<R>(t: GenericTestContext<Context<any>>, 
	callback: () => Promise<R>, message: string): Promise<R> {
		return new Promise<R>((resolve) => {
			t.notThrows(async () => {
				resolve(await callback());
			}, message);
		});
	}

export function doesNotThrow<R>(t: GenericTestContext<Context<any>>, callback: () => R, 
	message: string) {
		let result: R;
		t.notThrows(() => {
			result = callback();
		}, message);
		return result!;
	}

export async function doTry<R>(fn: () => Promise<R>): Promise<R|null> {
	try {
		return await fn();
	} catch(e) {
		return null;
	}
}

export function isErr<O>(t: GenericTestContext<Context<any>>, data: ERRS|O): data is ERRS {
	t.not(data, ERRS.INVALID_DECRYPT as ERRS, 'is not an invalid decrypt');
	return data === ERRS.INVALID_DECRYPT;
}