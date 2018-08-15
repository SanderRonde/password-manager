import { encryptWithPublicKey, genRSAKeyPair, ERRS, hash, pad, decryptWithPrivateKey, encrypt, decryptWithSalt, decrypt } from "../../app/lib/crypto";
import { EncryptedInstance, TypedObjectID, MongoRecord, EncryptedPassword } from "../../app/../../shared/types/db-types";
import { getDB, clearDB, genDBWithPW, genAccountOnly, genInstancesOnly } from "./db";
import { APIFns, APIArgs, APIReturns } from "../../app/../../shared/types/api";
import { TEST_DB_URI, ENCRYPTION_ALGORITHM } from "../../app/lib/constants";
import { genRandomString, optionalArrayItem } from "../../app/lib/util";
import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { Readable } from "stream";
import * as mongo from 'mongodb'
import { assert } from 'chai';
import * as fs from 'fs-extra'
import * as path from 'path'
import * as http from 'http'
import * as net from 'net'
import * as url from 'url'

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

export async function genTempDatabase(): Promise<string> {
	const suffix = genRandomString(25);

	const uri = `${TEST_DB_URI}${suffix}`;
	const { db, done } = await getDB(uri);
	if (await db.collection('meta').findOne({
		type: '__test'
	})) {
		//Collission, create a new one
		done();
		return await genTempDatabase();
	}

	await db.collection('meta').insertOne({
		type: '__test'
	});

	return uri;
}

export function captureCreatedFiles(): string[] {
	const arr: string[] = [];
	after('Delete files', async () => {
		await Promise.all(arr.map(async (filepath) => {
			await fs.unlink(filepath).catch(() => {});
		}));
	});
	return arr;
}

export function captureURIs(): string[] {
	const arr: string[] = [];
	after('Clear databases', async () => {
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
	enableRateLimit?: boolean;
	count: number;
}

export interface MockConfig {
	resetKey?: string;
	twofactor_secret?: string;
	account_twofactor_enabled?: boolean;
	instance_twofactor_enabled?: boolean;
}

export async function genUserAndDb(config: MockConfig = {}): Promise<UserAndDbData> {
	const uri = await genTempDatabase();
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
		count: 0
	}
}

export function createServer({ 
	uri, 
	http, 
	dbpw,
	logServerOutput,
	enableRateLimit
}: UserAndDbData, env?: {}): Promise<ChildProcess> {
	return new Promise((resolve) => {
		const proc = spawn('node', [...[
				path.join(__dirname, './../../app/main.js'),
				'server',
				'--http', http + '',
				'--no-https-only',
				'-p', dbpw,
				'-d', uri	
			], 
			...optionalArrayItem('--debug', !!env),
			...optionalArrayItem('--no-ratelimit-', !enableRateLimit)
		], {
			env: {...process.env, ...(env || {})}
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

export async function doServerAPIRequest<K extends keyof APIFns>({ port, publicKey }: {
	port: number;
	publicKey: string;
}, path: K,args: APIArgs[K][0], encrypted: APIArgs[K][1]): Promise<EncodedString<APIReturns[K]>>;
export async function doServerAPIRequest<K extends keyof APIFns>({ port }: {
	port: number;
	publicKey?: string;
}, path: K,args: APIArgs[K][0]): Promise<EncodedString<APIReturns[K]>>;
export async function doServerAPIRequest<K extends keyof APIFns>({ port, publicKey }: {
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

export async function doServerPostRequest<K extends keyof APIFns>({ port, publicKey }: {
	port: number;
	publicKey: string;
}, path: K,args: APIArgs[K][0], encrypted: APIArgs[K][1]): Promise<{
	response: http.IncomingMessage;
	responseText: EncodedString<APIReturns[K]>
}>;
export async function doServerPostRequest<K extends keyof APIFns>({ port }: {
	port: number;
	publicKey?: string;
}, path: K,args: APIArgs[K][0]): Promise<{
	response: http.IncomingMessage;
	responseText: EncodedString<APIReturns[K]>
}>;
export async function doServerPostRequest<K extends keyof APIFns>({ port, publicKey }: {
	port: number;
	publicKey?: string;
}, path: K,args: APIArgs[K][0], encrypted?: APIArgs[K][1]): Promise<{
	response: http.IncomingMessage;
	responseText: EncodedString<APIReturns[K]>
}> {
	return new Promise<{
		response: http.IncomingMessage;
		responseText: EncodedString<APIReturns[K]>
	}>((resolve, reject) => {
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
				resolve({
					response: res,
					responseText: responseText as EncodedString<APIReturns[K]>
				});
			});
			res.once('error', (err) => {
				reject(err);
			});
		});
		req.write(data);
		req.end();
	});
}

export function doesNotThrowAsync<R>(callback: () => Promise<R>, 
	message: string): Promise<R> {
		return new Promise<R>((resolve) => {
			assert.doesNotThrow(async () => {
				resolve(await callback());
			}, message);
		});
	}

export function doesNotThrow<R>(callback: () => R, 
	message: string) {
		let result: R;
		assert.doesNotThrow(() => {
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

export function isErr<O>(data: ERRS|O): data is ERRS {
	assert.notStrictEqual(data, ERRS.INVALID_DECRYPT as ERRS, 'is not an invalid decrypt');
	return data === ERRS.INVALID_DECRYPT;
}

export async function getLoginToken(config: UserAndDbData) {
	const { 
		http, 
		userpw, 
		server_public_key, 
		instance_id, 
		instance_private_key
	} = config;

	const challenge = genRandomString(25);
	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/instance/login', {
		instance_id: instance_id.toHexString(),
		challenge: encryptWithPublicKey(challenge, server_public_key)
	}, {
		password_hash: hash(pad(userpw, 'masterpwverify'))
	}));

	assert.isTrue(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	const data = response.data;
	assert.isFalse(data.twofactor_required, 'further authentication is not required');
	if (data.twofactor_required === true) {
		return;
	}
	const token = decryptWithPrivateKey(data.auth_token, instance_private_key);
	assert.notStrictEqual(token, ERRS.INVALID_DECRYPT, 'is not invalid decrypt');
	if (token === ERRS.INVALID_DECRYPT) return;
	assert.strictEqual(typeof token, 'string', 'token is a string');

	assert.strictEqual(data.challenge, challenge, 'challenge matches');

	return token;
}

export function genURL(host: string = `www.${genRandomString(20)}.${genRandomString(3)}`) {
	return `http${
		Math.random() > 0.5 ? 's': ''
	}://${host}/${
		genRandomString(10)
	}`;
}

export async function setPasword(toSet: {
	websites: string[];
	twofactor_enabled: boolean;
	username: string;
	password: string;
	notes: string[];
}, token: string, config: UserAndDbData) {
	const { http, uri, server_public_key, userpw, instance_id, dbpw } = config;

	const expectedWebsites = toSet.websites;
	const expected2FAEnabled = toSet.twofactor_enabled;
	const expectedEncrypted = encrypt({
		username: toSet.username,
		password: toSet.password,
		notes: toSet.notes
	}, hash(pad(userpw, 'masterpwdecrypt')), ENCRYPTION_ALGORITHM);
	
	const response = JSON.parse(await doServerAPIRequest({ 
		port: http,
		publicKey: server_public_key
	}, '/api/password/set', {
		instance_id: config.instance_id.toHexString()
	}, {
		token: token!,
		websites: expectedWebsites,
		twofactor_enabled: expected2FAEnabled,
		encrypted: expectedEncrypted,
		count: config.count++
	}));

	assert.isTrue(response.success, 'API call succeeded');
	if (!response.success) {
		return;
	}
	
	const data = response.data;
	assert.strictEqual(typeof data.id, 'string', 'passed id is a string');

	//Check if it was actually created
	const { db, done } = await getDB(uri);
	const password = await db.collection('passwords').findOne({
		_id: new mongo.ObjectId(data.id)
	}) as MongoRecord<EncryptedPassword>;
	assert.notStrictEqual(password, null, 'record was found');

	const instance = await db.collection('instances').findOne({
		_id: instance_id
	}) as MongoRecord<EncryptedInstance>;
	assert.notStrictEqual(instance, null, 'instance was found');
	done();

	assert.strictEqual(password.user_id.toHexString(), instance.user_id.toHexString(),
		'user ids match');
	const decryptedTwofactorEnabled = decryptWithSalt(password.twofactor_enabled,
		dbpw);
	assert.notStrictEqual(decryptedTwofactorEnabled, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	assert.strictEqual(decryptedTwofactorEnabled, expected2FAEnabled, 'twofactor enabled is the same');

	const actualWebsites = password.websites.map(({ exact, host }) => {
		return {
			host: decrypt(host, dbpw),
			exact: decrypt(exact, dbpw)
		}
	});
	for (const { host, exact } of actualWebsites) {
		assert.notStrictEqual(host, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
		assert.notStrictEqual(exact, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	}

	for (let i = 0; i < expectedWebsites.length; i++) {
		const expectedWebsite = expectedWebsites[i];
		const actualWebsite = actualWebsites[i];

		const host = url.parse(expectedWebsite).hostname ||
			url.parse(expectedWebsite).host || expectedWebsite;
		assert.isTrue(!!actualWebsite, 'a website exists at given index');
		assert.strictEqual(actualWebsite.host, host, 'hosts match');
		assert.strictEqual(actualWebsite.exact, expectedWebsite, 'actual urls match');
	}

	const decryptedEncryptedData = decrypt(password.encrypted, dbpw);
	assert.notStrictEqual(decryptedEncryptedData, ERRS.INVALID_DECRYPT, 'is not an invalid decrypt');
	if (decryptedTwofactorEnabled === ERRS.INVALID_DECRYPT) return;
	assert.strictEqual(decryptedEncryptedData, expectedEncrypted, 'encrypted data is the same');

	return data.id;
}