import { encrypt, decrypt } from '../lib/crypto';
import { CONSTANTS } from '../lib/constants';
import { exitWith } from '../lib/util';
import promptly = require('promptly');
import mongo = require('mongodb');

export async function getDatabase(key: string, quitOnError: boolean): Promise<Database> {
	const instance = await new Database(quitOnError).init();

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
			console.log(`Attempt ${i + 1}/5`);
			const password = await promptly.password('Please enter the database password');
			if (instance.canDecrypt(password)) {
				instance.setKey(password);
				return instance;
			}
		}
	}
	return exitWith('Database can\'t be decrypted with that key; password invalid');
}

export type DatabaseEncrypted<T> = {
	data: string;
	algorithm: string;
	__data?: T;
}

export type MasterPasswordEncrypted<T> = string & {
	__encrypted: T;
}

export type Hashed<T> = string & {
	__hashed: T;
}

type MongoRecord<T> = T & {
	_id: TypedObjectID<T>;
}

export interface EncryptedAccount {
	email: DatabaseEncrypted<EncodedString<string>>;
	pw: DatabaseEncrypted<EncodedString<Hashed<string>>>;
}

export interface DecryptedAccount {
	email: string;
	pw: Hashed<string>;
}

declare class TypedObjectID<T> extends mongo.ObjectID { }

type StringifiedObjectId<T> = string & {
	__id: TypedObjectID<T>;
}

interface TypedCollection<C = any> extends mongo.Collection<C> {
	findOne<T = C>(filter: {
		_id: TypedObjectID<T>;
	}, callback: mongo.MongoCallback<T | null>): void;
	findOne<T = C>(filter: {
		_id: TypedObjectID<T>;
	}, options?: mongo.FindOneOptions): Promise<T | null>;
    findOne<T = C>(filter: {
		_id: TypedObjectID<T>;
	}, options: mongo.FindOneOptions, callback: mongo.MongoCallback<T | null>): void;
	findOne<T = C>(filter: mongo.FilterQuery<C>, callback: mongo.MongoCallback<T | null>): void;
    findOne<T = C>(filter: mongo.FilterQuery<C>, options?: mongo.FindOneOptions): Promise<T | null>;
    findOne<T = C>(filter: mongo.FilterQuery<C>, options: mongo.FindOneOptions, callback: mongo.MongoCallback<T | null>): void;
}

export interface Instance {
	instance_id: number;
	twofactor_enabled: boolean;
	public_key:DatabaseEncrypted<EncodedString<string>>; 
	user_id: TypedObjectID<EncryptedAccount>;
}

export interface EncryptedPassword {
	user_id: DatabaseEncrypted<EncodedString<StringifiedObjectId<EncryptedAccount>>>;
	websites: DatabaseEncrypted<EncodedString<string>>[];
	encrypted: DatabaseEncrypted<EncodedString<{
		username: string;
		encrypted: MasterPasswordEncrypted<EncodedString<{
			password: string;
			notes: string[];
		}>>;
	}>>;
}

export interface DecryptedPassword {
	user_id: TypedObjectID<EncryptedAccount>;
	websites: string[];
	username: string;
	encrypted: MasterPasswordEncrypted<EncodedString<{
		password: string;
		notes: string[];
	}>>;
}

export enum COLLECTIONS {
	USERS,
	INSTANCES,
	PASSWORDS
}

interface EncryptedCollectionRecords {
	[COLLECTIONS.USERS]: EncryptedAccount;
	[COLLECTIONS.INSTANCES]: Instance;
	[COLLECTIONS.PASSWORDS]: EncryptedPassword;
}

export class Database {
	private _initialized: boolean = false;
	private _mongoInstance: mongo.Db;
	private _obfuscatedKey: string;
	private _keySpacing: number;
	private readonly _obfuscateChars = 
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

	public collections: {
		users: TypedCollection<MongoRecord<EncryptedAccount>>;
		instances: TypedCollection<MongoRecord<Instance>>;
		passwords: TypedCollection<MongoRecord<EncryptedPassword>>;
	}


	constructor(private _quitOnError: boolean) { }

	public async init() {
		if (this._initialized) {
			return this;
		}
		this._mongoInstance = await this._connectToMongo();
		this.collections = await this._getCollections();
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

	private _err(message: string) {
		if (this._quitOnError) {
			throw new Error(message);
		} else {
			console.log(message);
		}
	}

	private _getCollection<C extends COLLECTIONS>(collection: C): TypedCollection<EncryptedCollectionRecords[C]> {
		switch (collection) {
			case COLLECTIONS.USERS:
				return this.collections.users;
			case COLLECTIONS.INSTANCES:
				return this.collections.instances;
			case COLLECTIONS.PASSWORDS:
				return this.collections.passwords;
		}
		this._err('Could not find given collection');
		return null;
	}

	public dbEncrypt<T>(data: T, 
		key: string = this._deObfuscateKey()): DatabaseEncrypted<EncodedString<T>> {
			return encrypt(data, key, CONSTANTS.algorithm);
		}

	public dbDecrypt<T>(data: DatabaseEncrypted<EncodedString<T>>, 
		key: string = this._deObfuscateKey()): T {
			return decrypt(data, key);
		}

	public async canDecrypt(key: string) {
		const record = await this._mongoInstance.collection('meta').findOne({
			type: 'database'
		});
		if (!record) {
			//Uninitialized database, initialize now
			console.log('Empty database, creating with this key');
			await this._mongoInstance.collection('meta').insertOne({
				type: 'database',
				data: this.dbEncrypt('decrypted', key)
			});
			return true;
		}
		return this.dbDecrypt(record.data, key) === 'decrypted';
	}

	public setKey(key: string) {
		this._obfuscatedKey = this._obfuscateKey(key);
	}

	public async insertOne<R extends EncryptedCollectionRecords[C], 
		C extends COLLECTIONS>(collectionName: C, record: R) {
			const collection = this._getCollection(collectionName);
			if (!collection) {
				return;
			}

			const { result: { ok } } = await collection.insertOne(record);
			if (!ok) {
				this._err('Failed to insert record into the database');
			}
		}

	public async findOne<R extends EncryptedCollectionRecords[C], 
		C extends COLLECTIONS>(collectionName: C, filter: R|mongo.FilterQuery<R>): Promise<MongoRecord<R> | null> {
			const collection = this._getCollection(collectionName);
			if (!collection) {
				return null;
			}

			const record = await collection.findOne(filter);
			if (record) {
				return record as MongoRecord<R>;
			}
			return null;
		}

	public async deleteOne<R extends EncryptedCollectionRecords[C], 
		C extends COLLECTIONS>(collectionName: C, filter: R|mongo.FilterQuery<R>): Promise<void> {
			const collection = this._getCollection(collectionName);
			if (!collection) {
				return;
			}

			const {  result: { ok } } = await collection.deleteOne(filter);
			if (!ok) {
				this._err('Failed to delete record');
			}
		}

	public async deleteMany<R extends EncryptedCollectionRecords[C], 
		C extends COLLECTIONS>(collectionName: C, filter: R|mongo.FilterQuery<R>): Promise<void> {
			const collection = this._getCollection(collectionName);
			if (!collection) {
				return;
			}

			const { deletedCount } = await collection.deleteMany(filter);
			if (!deletedCount) {
				this._err('Failed to delete record');
			}
		}

}