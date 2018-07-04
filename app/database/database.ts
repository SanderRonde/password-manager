import { TypedObjectID, EncryptedAccount, EncryptedInstance, EncryptedPassword, MongoRecord } from './db-types';
import { DatabaseManipulation } from './libs/db-manipulation';
import { DatabaseEncryption } from './libs/db-encryption';
import { exitWith, readPassword } from '../lib/util';
import mongo = require('mongodb');
import { Log } from '../main';

export async function getDatabase(log: Log, dbPath: string, key: string, 
		quitOnError: boolean): Promise<Database> {
		const instance = await new Database(dbPath, quitOnError, log).init();

		const isReadline = !!key;
		if (!isReadline) {
			if (instance.Crypto.canDecrypt(key)) {
				instance.Crypto.setKey(key);
				return instance;
			}
			exitWith(log, 'Database can\'t be decrypted with that key; password invalid');		
		} else {
			//Give them 5 tries
			for (let i = 0; i < 5; i++) {
				log.write(`Attempt ${i + 1}/5`);
				const password = await readPassword(log, 'Please enter the database password');
				if (instance.Crypto.canDecrypt(password)) {
					instance.Crypto.setKey(password);
					return instance;
				}
			}
		}
		return exitWith(log, 'Database can\'t be decrypted with that key; password invalid');
	}

export interface TypedCollection<C = any> extends mongo.Collection<MongoRecord<C>> {
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

export enum COLLECTIONS {
	USERS,
	INSTANCES,
	PASSWORDS
}

export class Database {
	private _initialized: boolean = false;
	
	public mongoInstance: mongo.Db;
	public collections: {
		users: TypedCollection<MongoRecord<EncryptedAccount>>;
		instances: TypedCollection<MongoRecord<EncryptedInstance>>;
		passwords: TypedCollection<MongoRecord<EncryptedPassword>>;
	}

	public Crypto: DatabaseEncryption = new DatabaseEncryption(this)
	public Manipulation: DatabaseManipulation = new DatabaseManipulation(this)

	constructor(private _dbPath: string, private _quitOnError: boolean, public log: Log) { }

	public async init() {
		if (this._initialized) {
			return this;
		}
		this.mongoInstance = await this._connectToMongo();
		this.collections = await this._getCollections();
		this._initialized = true;
		return this;
	}

	private async _connectToMongo(): Promise<mongo.Db> {
		return await mongo.connect(this._dbPath).catch((err) => {
			if (err !== null && err) {
				if (err.message.includes('ECONNREFUSED')) {
					exitWith(this.log, 'Looks like you didn\'t start the mongodb service');
				}
				exitWith(this.log, err.message);
			}
		}) as mongo.Db;
	}

	private _getCollections() {
		return {
			users: this.mongoInstance.collection('users'),
			instances: this.mongoInstance.collection('instances'),
			passwords: this.mongoInstance.collection('passwords')
		}
	}

	public err(message: string) {
		if (this._quitOnError) {
			throw new Error(message);
		} else {
			this.log.write(message);
		}
	}
}