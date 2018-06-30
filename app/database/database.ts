import { exitWith } from '../lib/util';
import promptly = require('promptly');
import crypto = require('crypto');
import mongo = require('mongodb');

export async function getDatabase(key: string): Promise<Database> {
	const instance = await new Database().init();

	const isReadline = !!key;
	if (!isReadline) {
		if (instance.canDecrypt(key)) {
			instance.setKey(key);
			return instance;
		}
		exitWith('Database can\'t be decrypted with that key; password invalid');		
	} else {
		//Give them 5 tries
		for (let i = 0; i < 5; i++) {
			const password = await promptly.password('Please enter the database password');
			if (instance.canDecrypt(password)) {
				instance.setKey(password);
				return instance;
			}
		}
	}
	return exitWith('Database can\'t be decrypted with that key; password invalid');
}

export class Database {
	private _initialized: boolean = false;
	private _mongoInstance: mongo.Db;
	private _collections: {
		users: mongo.Collection;
		instances: mongo.Collection;
		passwords: mongo.Collection;
	}
	private _obfuscatedKey: string;
	private _keySpacing: number;
	private readonly _obfuscateChars = 
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';


	constructor() { }

	public async init() {
		if (this._initialized) {
			return this;
		}
		this._mongoInstance = await this._connectToMongo();
		this._collections = await this._getCollections();
		this._initialized = true;
		return this;
	}

	private _obfuscateKey(key: string) {
		const firstPart = key.slice(0, 256);
		
		const obfuscateCharsLength = this._obfuscateChars.length;
		const spacing = this._keySpacing = Math.floor(256 / firstPart.length + 1);
		const finalKey: string[] = [];
		for (const char of firstPart) {
			for (let i = 0; i < spacing; i++) {
				const index = Math.floor(Math.random() * obfuscateCharsLength);
				finalKey.push(this._obfuscateChars[index]);
			}
			finalKey.push(char);
		}
		for (let i = finalKey.length; finalKey.length < 256; i++) {
			const index = Math.floor(Math.random() * obfuscateCharsLength);
			finalKey.push(this._obfuscateChars[index]);
		}
		return `${finalKey.join('')}${key.slice(256)}`;
	}

	private _deObfuscateKey() {
		const firstPart = this._obfuscatedKey.slice(0, 256);
		const originalKey: string[] = [];

		const totalSpacing = this._keySpacing + 1;
		let paddingRemaining = totalSpacing;
		for (const char of firstPart) {
			paddingRemaining--;
			if (paddingRemaining === 0) {
				originalKey.push(char);
				paddingRemaining = totalSpacing;
			}
		}
		return `${originalKey.join('')}${this._obfuscatedKey.slice(256)}`;
	}

	private async _connectToMongo(): Promise<mongo.Db> {
		return await mongo.connect('mongodb://127.0.0.1:27017/pwmanager').catch((err) => {
			if (err !== null && err) {
				if (err.message.includes('ECONNREFUSED')) {
					exitWith('Looks like you didn\'t start the mongodb service');
				}
				exitWith(err.message);
			}
		}) as mongo.Db;
	}

	private _getCollections() {
		return {
			users: this._mongoInstance.collection('users'),
			instances: this._mongoInstance.collection('instances'),
			passwords: this._mongoInstance.collection('passwords')
		}
	}

	private _encrypt(data: string, key: string = this._deObfuscateKey()) {
		const sha256 = crypto.createHash('sha256');
		sha256.update(key);

		const iv = crypto.randomBytes(16);
		const plaintext = new Buffer(data);
		const cipher = crypto.createCipheriv('aes-256-ctr', sha256.digest(), iv);
		const ciphertext = cipher.update(plaintext);
		const finalText = Buffer.concat([iv, ciphertext, cipher.final()]);
	
		return finalText.toString('base64');
	}

	private _decrypt(data: string, key: string = this._deObfuscateKey()) {
		const sha256 = crypto.createHash('sha256');
		sha256.update(key);

		const input = new Buffer(data, 'base64');
		const iv = input.slice(0, 16);
		const ciphertext = input.slice(16);
		const decipher = crypto.createDecipheriv('aes-256-ctr', sha256.digest(), iv);
		const plaintext = decipher.update(ciphertext);

		return plaintext.toString() + decipher.final();
	}

	public async canDecrypt(key: string) {
		const record = await this._mongoInstance.collection('meta').findOne({
			index: 1
		});
		if (!record) {
			//Uninitialized database, initialize now
			console.log('Empty database, creating with this key');
			await this._mongoInstance.collection('meta').insertOne({
				index: 1,
				data: this._encrypt('decrypted', key)
			});
			return true;
		}
		return this._decrypt(record.data, key) === 'decrypted';
	}

	public setKey(key: string) {
		this._obfuscatedKey = this._obfuscateKey(key);
	}
}