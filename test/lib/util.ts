import { APIFns, APIArgs, APIReturns, API_ERRS, GetRequired, GetOptional, GetEncrypted, GetOptionalEncrypted } from "../../app/api";
import { getDB, clearDB, genDBWithPW, genAccountOnly, genInstancesOnly } from "./db";
import { EncryptedInstance, TypedObjectID } from "../../app/database/db-types";
import { encryptWithPublicKey, genRSAKeyPair } from "../../app/lib/crypto";
import { GenericTestContext, Context, RegisterContextual } from "ava";
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
}

export interface MockConfig {
	twofactor_token?: string;
	twofactor_enabled?: boolean;
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
	dbpw 
}: UserAndDbData): Promise<ChildProcess> {
	return new Promise((resolve) => {
		const proc = spawn('node', [
			path.join(__dirname, './../../app/main.js'),
			'server',
			'--http', http + '',
			'--no-rate-limit',
			'-p', dbpw,
			'-d', uri
		]);
		proc.unref();
		listenWithoutRef(proc.stdout, (chunk) => {
			if (chunk.trim() === `HTTP server listening on port ${http}`) {
				resolve(proc);
			}
		});
	});
}

export async function doAPIRequest<K extends keyof APIFns>({ port, publicKey }: {
	port: number;
	publicKey?: string;
}, path: K,
	args: APIArgs[K][0], encrypted?: APIArgs[K][1]): Promise<EncodedString<APIReturns[K]>> {
		return new Promise<EncodedString<APIReturns[K]>>((resolve, reject) => {
			const data = JSON.stringify({...args as Object, ...(encrypted && publicKey ? {
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

async function doServerSetupAndBreakdown(t: GenericTestContext<Context<any>>, uris: string[]) {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	uris.push(config.uri);
	return {
		done() {
			server.kill();
		},
		config
	}
}

function getFillerType(keyType: 'string'|'boolean'|'number'|'array') {
	switch (keyType) {
		case 'string':
			return 'string';
		case 'boolean':
			return false;
		case 'number':
			return 0;
		case 'array':
			return [];
	}
}

function getWrongType(keyType: 'string'|'boolean'|'number'|'array') {
	switch (keyType) {
		case 'string':
			return false;
		case 'boolean':
			return 'string';
		case 'number':
			return [];
		case 'array':
			return 0;
	}
}

function mapObj<T extends Object, R>(obj: T, fn: (key: keyof T, val: T[keyof T]) => R): {
	[P in keyof T]: R;
} {
	const newObj: Partial<{
		[P in keyof T]: R;
	}> = {};
	for (const key in obj) {
		newObj[key] = fn(key, obj[key]);
	}
	return newObj as {
		[P in keyof T]: R;
	};
}

export function testParams<R extends keyof APIFns>(test: RegisterContextual<any>, uris: string[], route: R, required: {
	[key in keyof GetRequired<APIFns[R]>]: 'string'|'boolean'|'number'|'array';
}, optional: {
	[key in keyof GetOptional<APIFns[R]>]: 'string'|'boolean'|'number'|'array';
}, encrypted: {
	[key in keyof GetEncrypted<APIFns[R]>]: 'string'|'boolean'|'number'|'array';
}, optionalEncrypted: {
	[key in keyof GetOptionalEncrypted<APIFns[R]>]: 'string'|'boolean'|'number'|'array';
}) {
	// Test missing params
	test(`no params for route "${route}"`, async t => {
		const { config, done } = await doServerSetupAndBreakdown(t, uris);
		const response = JSON.parse(await doAPIRequest({
			port: config.http,
			publicKey: config.server_public_key
		}, route, {} as any)) as {
			success: false;
			ERR: API_ERRS;
		};
		t.false(response.success, 'request failed');
		t.is(response.ERR, API_ERRS.MISSING_PARAMS, 'MISSING_PARAMS error is thrown');
		done();
	});

	//Missing a single unencrypted param
	for (const missingKey in required) {
		test(`missing unencrypted param "${missingKey}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs: Partial<{
				[key in keyof GetRequired<APIFns[R]>]: any;
			}> = {};
			const encryptedArgs: {
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			} = mapObj(encrypted, (_, val) => getFillerType(val));
			for (const key in required) {
				if (key !== missingKey) {
					unencryptedArgs[key] = getFillerType(required[key]);
				}
			}
			const response = JSON.parse(await doAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...(missingKey === 'instance_id' ? {} : {
				instance_id: config.instance_id
			})}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.MISSING_PARAMS, 'MISSING_PARAMS error is thrown');
			done();
		});
	}

	//Missing a single encrypted param
	for (const missingKey in encrypted) {
		test(`missing encrypted param "${missingKey}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs: {
				[key in keyof GetRequired<APIFns[R]>]: any;
			} = mapObj(required, (_, val) => getFillerType(val));
			const encryptedArgs: Partial<{
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			}> = {};
			for (const key in encrypted) {
				if (key !== missingKey) {
					encryptedArgs[key] = getFillerType(encrypted[key]);
				}
			}
			const response = JSON.parse(await doAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...{
				instance_id: config.instance_id
			}}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.MISSING_PARAMS, 'MISSING_PARAMS error is thrown');
			done();
		});
	}

	//Wrong unencrypted required types
	for (const wrongType in required) {
		test(`wrong type for unencrypted required param "${wrongType}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs = {
				[wrongType]: getWrongType(required[wrongType])
			} as Partial<{
				[key in keyof GetRequired<APIFns[R]>]: any;
			}>;
			const encryptedArgs: Partial<{
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			}> = {};
			for (const key in required) {
				if (key !== wrongType) {
					unencryptedArgs[key] = getFillerType(required[key]);
				}
			}
			const response = JSON.parse(await doAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...(wrongType === 'instance_id' ? {} : {
				instance_id: config.instance_id
			})}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.INVALID_PARAM_TYPES, 'INVALID_PARAM_TYPES error is thrown');
			done();
		});
	}

	//Wrong encrypted required types
	for (const wrongType in encrypted) {
		test(`wrong type for encrypted required param "${wrongType}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs: {
				[key in keyof GetRequired<APIFns[R]>]: any;
			} = mapObj(required, (_, val) => getFillerType(val));
			const encryptedArgs = {
				[wrongType]: getWrongType(encrypted[wrongType])
			} as Partial<{
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			}>;
			for (const key in encrypted) {
				if (key !== wrongType) {
					encryptedArgs[key] = getFillerType(encrypted[key]);
				}
			}
			const response = JSON.parse(await doAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...{
				instance_id: config.instance_id
			}}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.INVALID_PARAM_TYPES, 'INVALID_PARAM_TYPES error is thrown');
			done();
		});
	}

	//Wrong unencrypted optional types
	for (const wrongType in optional) {
		test(`wrong type for unencrypted optional param "${wrongType}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs = {...mapObj(required, (_, val) => getFillerType(val)) as object, ...{
				[wrongType]: getWrongType(optional[wrongType])
			}} as {
				[key in keyof GetRequired<APIFns[R]>]: any;
			};
			const encryptedArgs: {
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			} = mapObj(encrypted, (_, val) => getFillerType(val));
			const response = JSON.parse(await doAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...{
				instance_id: config.instance_id
			}}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.INVALID_PARAM_TYPES, 'INVALID_PARAM_TYPES error is thrown');
			done();
		});
	}

	//Wrong encrypted optional types
	for (const wrongType in optionalEncrypted) {
		test(`wrong type for encrypted optional param "${wrongType}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs = mapObj(required, (_, val) => getFillerType(val)) as {
				[key in keyof GetRequired<APIFns[R]>]: any;
			};
			const encryptedArgs = {...mapObj(encrypted, (_, val) => getFillerType(val)) as object, ...{
				[wrongType]: getWrongType(optionalEncrypted[wrongType])
			}} as {
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			};
			const response = JSON.parse(await doAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...{
				instance_id: config.instance_id
			}}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.INVALID_PARAM_TYPES, 'INVALID_PARAM_TYPES error is thrown');
			done();
		});
	}
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