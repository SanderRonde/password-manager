import { GenericTestContext, Context, RegisterContextual } from "ava";
import { getDB, clearDB, genDBWithPW, genMockAcount } from "./db";
import { TEST_DB_URI } from "../../app/lib/constants";
import { genRandomString } from "../../app/lib/util";
import { spawn, ChildProcess } from "child_process";
import { APIFns, APIArgs, APIReturns } from "../../app/api";
import querystring = require('querystring');
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
			await fs.unlink(filepath);
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
	userpw: string;
	https: number;
	http: number;
	dbpw: string;
	uri: string;
}

export async function genUserAndDb(t: GenericTestContext<Context<any>>): Promise<UserAndDbData> {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(25);

	const dbpw = await genDBWithPW(uri);
	await genMockAcount({
		userpw,
		dbpw,
		uri
	});
	return {
		userpw,
		dbpw,
		uri,
		http: await getFreePort(30000, 50000),
		https: await getFreePort(30000, 50000)
	}
}

export function createServer({ 
	https, 
	uri, 
	http, 
	dbpw 
}: UserAndDbData): Promise<ChildProcess> {
	return new Promise((resolve) => {
		const proc = spawn('node', [
			path.join(__dirname, './../../app/main.js'),
			'server',
			'--http', http + '',
			'--https', https + '',
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

export async function doAPIRequest<K extends keyof APIFns>(port: number, path: K,
	args: APIArgs[K]): Promise<EncodedString<APIReturns[K]>> {
		return new Promise<EncodedString<APIReturns[K]>>((resolve, reject) => {
			const postData = querystring.stringify(args);
			const req = http.request({
				port,
				hostname: '127.0.0.1',
				method: 'POST',
				path
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
			req.write(postData);
			req.end();
		});
	}