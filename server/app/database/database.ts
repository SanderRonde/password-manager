
import { EncryptedAccount, EncryptedInstance, EncryptedPassword, MongoRecord } from './../../../shared/types/db-types';
import { exitWith, readPassword, getDBFromURI } from '../lib/util';
import { DatabaseManipulation } from './libs/db-manipulation';
import { DatabaseEncryption } from './libs/db-encryption';
import { MockMongoDb, TypedCollection } from './mocks';
import * as mongo from 'mongodb'

export async function getDatabase(dbPath: string, password: string|undefined, 
	quitOnError: boolean, useMockDb: boolean): Promise<Database> {
		const instance = await new Database(dbPath, quitOnError, useMockDb).init();

		if (password !== undefined) {
			if (await instance.Crypto.canDecrypt(password)) {
				instance.Crypto.setKey(password);
				return instance;
			}
			exitWith('Database can\'t be decrypted with that key; password invalid');		
		} else {
			for (let i = 0; i < 5; i++) {
				console.log(`Attempt ${i + 1}/5`);
				const password = await readPassword(await instance.Crypto.hasEncryptionPassword() ?
					'Please enter the database password' : 'Please enter a new database password');
				if (await instance.Crypto.canDecrypt(password)) {
					instance.Crypto.setKey(password);
					return instance;
				}
			}
		}
		return exitWith('Database can\'t be decrypted with that key; password invalid');
	}

export enum COLLECTIONS {
	USERS,
	INSTANCES,
	PASSWORDS
}

export class Database {
	private _initialized: boolean = false;
	
	public mongoInstance!: mongo.Db|MockMongoDb;
	public mongoClient!: mongo.MongoClient;
	public collections!: {
		users: TypedCollection<MongoRecord<EncryptedAccount>>;
		instances: TypedCollection<MongoRecord<EncryptedInstance>>;
		passwords: TypedCollection<MongoRecord<EncryptedPassword>>;
	}

	public Crypto: DatabaseEncryption;
	public Manipulation: DatabaseManipulation;

	constructor(private _dbPath: string, private _quitOnError: boolean, private _mockDb: boolean) { 
		this.Crypto = new DatabaseEncryption(this);
		this.Manipulation = new DatabaseManipulation(this);
	}

	public async init() {
		if (this._initialized) {
			return this;
		}
		this.mongoInstance = this._mockDb ? new MockMongoDb() : await this._connectToMongo();
		this.collections = await this._getCollections();
		this._initialized = true;
		return this;
	}

	private async _connectToMongo(): Promise<mongo.Db> {
		this.mongoClient = await mongo.MongoClient.connect(this._dbPath, {
			useNewUrlParser: true
		} as mongo.MongoClientOptions).catch((err) => {
			if (err !== null && err) {
				if (err.message.includes('ECONNREFUSED')) {
					exitWith('Looks like you didn\'t start the mongodb service');
					return;
				}
				exitWith(`Got mongodb error ${err.message}`);
				return;
			}
		}) as mongo.MongoClient;
		return this.mongoClient.db(getDBFromURI(this._dbPath)) as mongo.Db;
	}

	private _getCollections(): {
		users: TypedCollection<MongoRecord<EncryptedAccount>>;
		instances: TypedCollection<MongoRecord<EncryptedInstance>>;
		passwords: TypedCollection<MongoRecord<EncryptedPassword>>;
	} {
		const db = this.mongoInstance as MockMongoDb;
		return {
			users: db.collection('users'),
			instances: db.collection('instances'),
			passwords: db.collection('passwords')
		}
	}

	public err(message: string) {
		if (this._quitOnError) {
			throw new Error(message);
		} else {
			console.log(message);
		}
	}

	public async kill() {
		await this.mongoClient.close();
	}
}