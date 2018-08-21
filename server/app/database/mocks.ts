import { MongoCallback, FilterQuery, CommonOptions, DeleteWriteOpResultObject, FindAndModifyWriteOpResultObject, FindOneAndReplaceOption, InsertOneWriteOpResult, CollectionInsertOneOptions, FindOneOptions } from 'mongodb';
import { TypedObjectID, EncryptedAccount, MongoRecord, EncryptedInstance, EncryptedPassword, StringifiedObjectId } from './../../../shared/types/db-types';
import { encrypt, hash, pad, encryptWithSalt, genRSAKeyPair, encryptWithPublicKey } from '../lib/crypto';
import { DEFAULT_EMAIL, ENCRYPTION_ALGORITHM, RESET_KEY_LENGTH } from '../lib/constants';
import { APISuccessfulReturns } from '../../../shared/types/api';
import { genRandomString } from '../lib/util';
import { Database } from './database';
import * as mongo from 'mongodb'

interface TypedCursor<C> {
	toArray(): Promise<C[]>;
	toArray(callback: MongoCallback<C[]>): void;
}

class MockCursor<C> implements TypedCursor<C> {
	constructor(private _records: C[]) { }

	toArray(): Promise<C[]>;
	toArray(callback: MongoCallback<C[]>): void;
	toArray(callback?: MongoCallback<C[]>): Promise<C[]>|void {
		if (callback) {
			callback(null!, this._records);
		} else {
			return Promise.resolve(this._records);
		}
	}
}

export interface TypedCollection<C = any> {
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
	
	count(callback: MongoCallback<number>): void;
    count(query: Object, callback: MongoCallback<number>): void;
    count(query?: Object, options?: mongo.MongoCountPreferences): Promise<number>;
	count(query: Object, options: mongo.MongoCountPreferences, callback: MongoCallback<number>): void;
	
	deleteMany(filter: FilterQuery<C>, callback: MongoCallback<DeleteWriteOpResultObject>): void;
    deleteMany(filter: FilterQuery<C>, options?: CommonOptions): Promise<DeleteWriteOpResultObject>;
	deleteMany(filter: FilterQuery<C>, options: CommonOptions, callback: MongoCallback<DeleteWriteOpResultObject>): void;
	
	deleteOne(filter: FilterQuery<C>, callback: MongoCallback<DeleteWriteOpResultObject>): void;
    deleteOne(filter: FilterQuery<C>, options?: CommonOptions & { bypassDocumentValidation?: boolean }): Promise<DeleteWriteOpResultObject>;
	deleteOne(filter: FilterQuery<C>, options: CommonOptions & { bypassDocumentValidation?: boolean }, callback: MongoCallback<DeleteWriteOpResultObject>): void;
	
	find<T = C>(query?: FilterQuery<C>): TypedCursor<T>;
	find<T = C>(query: FilterQuery<C>, options?: FindOneOptions): TypedCursor<T>;

	findOne<T = C>(filter: FilterQuery<C>, callback: MongoCallback<T | null>): void;
    findOne<T = C>(filter: FilterQuery<C>, options?: FindOneOptions): Promise<T | null>;
	findOne<T = C>(filter: FilterQuery<C>, options: FindOneOptions, callback: MongoCallback<T | null>): void;

	findOneAndUpdate(filter: FilterQuery<C>, update: Object, callback: MongoCallback<FindAndModifyWriteOpResultObject<C>>): void;
    findOneAndUpdate(filter: FilterQuery<C>, update: Object, options?: mongo.FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject<C>>;
    findOneAndUpdate(filter: FilterQuery<C>, update: Object, options: FindOneAndReplaceOption, callback: MongoCallback<FindAndModifyWriteOpResultObject<C>>): void;
	
	insertOne(docs: Object, callback: MongoCallback<InsertOneWriteOpResult>): void;
    insertOne(docs: Object, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult>;
	insertOne(docs: Object, options: CollectionInsertOneOptions, callback: MongoCallback<InsertOneWriteOpResult>): void;	
}

export class MockMongoCollection<R> implements TypedCollection<R> {
	collectionName: string;
	namespace = '';
	writeConcern = '';
	readConcern = '';
	hint = '';

	private _records: any[] = [];
	public done: Promise<any>;

	constructor(private _parent: MockMongoDb, name: string) {
		this.collectionName = name;
		this.done = this.doDev();
	}

	private _getKey() {
		return new Promise<string>((resolve) => {
			this._parent.parent.Crypto.getKey((dbpw) => {
				resolve(dbpw);
			});
		});
	}

	public async doDev() {
		const name = this.collectionName;
		if (process.env.NODE_ENV === 'development') {
			const pw = 'defaultpassword';
			const dbpw = await this._getKey();
			if (name === 'users') {
				//Create a user
				const resetKey = genRandomString(RESET_KEY_LENGTH);
				const user: MongoRecord<EncryptedAccount> = {
					_id: new mongo.ObjectId() as TypedObjectID<EncryptedAccount>,
					email: DEFAULT_EMAIL,
					pw: encrypt(hash(pad(pw, 'masterpwverify')), dbpw,
						ENCRYPTION_ALGORITHM),
					twofactor_enabled: encryptWithSalt(false, dbpw, 
						ENCRYPTION_ALGORITHM),
					twofactor_secret: encryptWithSalt(null, dbpw, 
						ENCRYPTION_ALGORITHM),
					reset_key: encrypt(encrypt({
						integrity: true as true,
						pw: pw
					}, resetKey, ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM)
				};
				console.log(`Created dev record with email "${
					DEFAULT_EMAIL}" and password "${pw}"`);
				this._records.push(user);
			} else if (name === 'instances') {
				let userId: TypedObjectID<EncryptedAccount>;
				await this._parent.collection('users').done;
				this._parent.collection('users').find().toArray((_err, userRecord) => {
					userId = (userRecord as any)._id;
				});

				const { publicKey } = genRSAKeyPair();
				const { privateKey } = genRSAKeyPair();
				const instance: MongoRecord<EncryptedInstance> = {
					_id: new mongo.ObjectId() as TypedObjectID<EncryptedInstance>,
					twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
					public_key: encrypt(publicKey, dbpw, ENCRYPTION_ALGORITHM),
					user_id: userId!,
					server_private_key: encrypt(privateKey, dbpw, ENCRYPTION_ALGORITHM),
					expires: Infinity
				};
				this._records.push(instance);
			} else if (name === 'passwords') {
				let userId: TypedObjectID<EncryptedAccount>;
				await this._parent.collection('users').done;
				this._parent.collection('users').find().toArray((_err, userRecord) => {
					userId = (userRecord as any)._id;
				});

				const passwords: MongoRecord<EncryptedPassword>[] = [{
					_id: new mongo.ObjectId() as TypedObjectID<EncryptedPassword>,
					user_id: userId!,
					twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
					websites: [{
						exact: encrypt('www.google.com/login', dbpw, ENCRYPTION_ALGORITHM),
						host: encrypt('www.google.com', dbpw, ENCRYPTION_ALGORITHM)
					}],
					encrypted: encrypt(encrypt({
						username: 'someusername',
						password: 'smepw',
						notes: []
					}, hash(pad(pw, 'masterpwdecrypt')),
						ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM)
				}, {
					_id: new mongo.ObjectId() as TypedObjectID<EncryptedPassword>,
					user_id: userId!,
					twofactor_enabled: encryptWithSalt(false, dbpw, ENCRYPTION_ALGORITHM),
					websites: [{
						exact: encrypt('www.reddit.com/r/random', dbpw, ENCRYPTION_ALGORITHM),
						host: encrypt('www.reddit.com', dbpw, ENCRYPTION_ALGORITHM)
					}],
					encrypted: encrypt(encrypt({
						username: 'someusername2',
						password: 'smepw2',
						notes: []
					}, hash(pad(pw, 'masterpwdecrypt')),
						ENCRYPTION_ALGORITHM), dbpw, ENCRYPTION_ALGORITHM)
				}];
				this._records.push(...passwords);
			}
		}
	}

	private _getHexString(id: mongo.ObjectId|string) {
		if (typeof id === 'string') {
			return id;
		}
		return id.toHexString();
	}

	private _find<T = R>(filter: {
		_id: TypedObjectID<T>;
	} | mongo.FilterQuery<any>) {
		const matches: T[] = [];
		for (const key in filter) {
			for (const item of this._records) {
				if ((key === '_id' &&
					this._getHexString(item._id) === this._getHexString(filter[key])) ||
					filter[key as keyof typeof filter] ===item[key]) {
						matches.push(item);
					}
			}
		}
		return matches;
	}

	findOne<T = R>(filter: {
		_id: TypedObjectID<T>;
	}, callback: mongo.MongoCallback<T | null>): void;
	findOne<T = R>(filter: {
		_id: TypedObjectID<T>;
	}, options?: mongo.FindOneOptions): Promise<T | null>;
	findOne<T = R>(filter: {
		_id: TypedObjectID<T>;
	}, options: mongo.FindOneOptions, callback: mongo.MongoCallback<T | null>): void;
	findOne<T = R>(filter: mongo.FilterQuery<R>, callback: mongo.MongoCallback<T | null>): void;
	findOne<T = R>(filter: mongo.FilterQuery<R>, options?: mongo.FindOneOptions): Promise<T | null>;
	findOne<T = R>(filter: mongo.FilterQuery<R>, options: mongo.FindOneOptions, callback: mongo.MongoCallback<T | null>): void;
	findOne<T = R>(filter: {
		_id: TypedObjectID<T>;
	} | mongo.FilterQuery<R>, optionsOrCallback?: mongo.MongoCallback<T | null> | mongo.FindOneOptions, callback?: mongo.MongoCallback<T | null>): void | Promise<T | null> {
		const matches = this._find<T>(filter)[0] || null;
		if (callback) {
			callback(null!, matches);
		}
		else if (typeof optionsOrCallback === 'function') {
			optionsOrCallback(null!, matches);
		}
		else {
			return Promise.resolve(matches);
		}
	}
	count(callback: MongoCallback<number>): void;
	count(query: Object, callback: MongoCallback<number>): void;
	count(query?: Object, options?: mongo.MongoCountPreferences): Promise<number>;
	count(query: Object, options: mongo.MongoCountPreferences, callback: MongoCallback<number>): void;
	count(callbackOrQuery: MongoCallback<number> | Object, callbackOrOptions?: MongoCallback<number> | mongo.MongoCountPreferences, callback?: MongoCallback<number>): Promise<number> | void {
		if (callback) {
			callback(null!, this._records.length);
		}
		else if (typeof callbackOrOptions === 'function') {
			callbackOrOptions(null!, this._records.length);
		}
		else if (typeof callbackOrQuery === 'function') {
			callbackOrQuery(null!, this._records.length);
		}
		else {
			return Promise.resolve(this._records.length);
		}
	}
	deleteMany(filter: FilterQuery<R>, callback: MongoCallback<DeleteWriteOpResultObject>): void;
	deleteMany(filter: FilterQuery<R>, options?: CommonOptions): Promise<DeleteWriteOpResultObject>;
	deleteMany(filter: FilterQuery<R>, options: CommonOptions, callback: MongoCallback<DeleteWriteOpResultObject>): void;
	deleteMany(filter: FilterQuery<R>, callbackOrOptions?: MongoCallback<DeleteWriteOpResultObject> | CommonOptions, callback?: MongoCallback<DeleteWriteOpResultObject>): Promise<DeleteWriteOpResultObject> | void {
		const matches = this._find(filter);
		for (const match of matches) {
			this._records.splice(this._records.indexOf(match), 1);
		}
		if (callback) {
			callback(null!, {
				result: {
					ok: matches.length,
					n: matches.length
				},
				deletedCount: matches.length
			});
		}
		else if (typeof callbackOrOptions === 'function') {
			callbackOrOptions(null!, {
				result: {
					ok: matches.length,
					n: matches.length
				},
				deletedCount: matches.length
			});
		}
		else {
			return Promise.resolve({
				result: {
					ok: matches.length,
					n: matches.length
				},
				deletedCount: matches.length
			});
		}
	}

	deleteOne(filter: FilterQuery<R>, callback: MongoCallback<DeleteWriteOpResultObject>): void;
    deleteOne(filter: FilterQuery<R>, options?: CommonOptions & { bypassDocumentValidation?: boolean }): Promise<DeleteWriteOpResultObject>;
	deleteOne(filter: FilterQuery<R>, options: CommonOptions & { bypassDocumentValidation?: boolean }, callback: MongoCallback<DeleteWriteOpResultObject>): void;
	deleteOne(filter: FilterQuery<R>, optionsOrCallback?: CommonOptions & { bypassDocumentValidation?: boolean }|MongoCallback<DeleteWriteOpResultObject>, callback?: MongoCallback<DeleteWriteOpResultObject>): Promise<DeleteWriteOpResultObject>|void {
		const matches = this._find(filter);
		for (const match of matches) {
			this._records.splice(this._records.indexOf(match), 1);
			break;
		}
		if (callback) {
			callback(null!, {
				result: {
					ok: matches.length
				}
			});
		} else if (typeof optionsOrCallback === 'function') {
			optionsOrCallback(null!, {
				result: {
					ok: matches.length
				}
			});
		} else {
			return Promise.resolve({
				result: {
					ok: matches.length
				}
			});
		}
	}
	
	find<T = R>(query?: FilterQuery<R>): TypedCursor<T>;
	find<T = R>(query: FilterQuery<R>, options?: FindOneOptions): TypedCursor<T>;
	find<T = R>(query?: FilterQuery<R>, _options?: FindOneOptions): TypedCursor<T> {
		const matches = query ? this._find(query) : this._records;
		return new MockCursor<T>(matches);
	}

	findOneAndUpdate(filter: FilterQuery<R>, update: Object, callback: MongoCallback<FindAndModifyWriteOpResultObject<R>>): void;
    findOneAndUpdate(filter: FilterQuery<R>, update: Object, options?: mongo.FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject<R>>;
	findOneAndUpdate(filter: FilterQuery<R>, update: Object, options: FindOneAndReplaceOption, callback: MongoCallback<FindAndModifyWriteOpResultObject<R>>): void;
	findOneAndUpdate(filter: FilterQuery<R>, update: Object, optionsOrCallback?: FindOneAndReplaceOption|MongoCallback<FindAndModifyWriteOpResultObject<R>>, callback?: MongoCallback<FindAndModifyWriteOpResultObject<R>>): void|Promise<FindAndModifyWriteOpResultObject<R>> {
		const match = this._find(filter)[0];
		if (match) {
			for (const key in update) {
				(match as any)[key] = (update as any)[key];		
			}
		}
		if (callback) {
			callback(null!, {
				ok: match ? 1 : undefined
			});
		} else if (typeof optionsOrCallback === 'function') {
			optionsOrCallback(null!, {
				ok: match ? 1 : undefined
			});
		} else {
			return Promise.resolve({
				ok: match ? 1 : undefined
			});
		}
	}
	
	insertOne(docs: Object, callback: MongoCallback<InsertOneWriteOpResult>): void;
    insertOne(docs: Object, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult>;
	insertOne(docs: Object, options: CollectionInsertOneOptions, callback: MongoCallback<InsertOneWriteOpResult>): void;
	insertOne(docs: Object, optionsOrCallback?: CollectionInsertOneOptions|MongoCallback<InsertOneWriteOpResult>, callback?: MongoCallback<InsertOneWriteOpResult>): void|Promise<InsertOneWriteOpResult> {
		const id = (docs as any)._id || new mongo.ObjectId()
		this._records.push({
			...docs,
			_id: id
		});
		if (callback) {
			callback(null!, {
				result: {
					ok: 1,
					n: 1
				},
				insertedCount: 1,
				ops: [],
				insertedId: id,
				connection: ''
			});
		} else if (typeof optionsOrCallback === 'function') {
			optionsOrCallback(null!, {
				result: {
					ok: 1,
					n: 1
				},
				insertedCount: 1,
				ops: [],
				insertedId: id,
				connection: ''
			});
		} else {
			return Promise.resolve({
				result: {
					ok: 1,
					n: 1
				},
				insertedCount: 1,
				ops: [],
				insertedId: id,
				connection: ''
			});
		}
	}
}

export class MockMongoDb {
	constructor(public parent: Database) {}

	private _collections: Map<string, MockMongoCollection<any>> = new Map();

	private _getCollection<R>(name: string) {
		if (this._collections.has(name)) {
			return this._collections.get(name)!;
		}
		const collection = new MockMongoCollection<R>(this, name);
		this._collections.set(name, collection);
		return collection;
	}

	collection<R = any>(name: string): MockMongoCollection<R>;
    collection<R = any>(name: string, callback: MongoCallback<MockMongoCollection<R>>): MockMongoCollection<R>;
	collection<R = any>(name: string, options: mongo.DbCollectionOptions, callback: MongoCallback<MockMongoCollection<R>>): MockMongoCollection<R>;
	collection<R = any>(name: string, callbackOrOptions?: MongoCallback<MockMongoCollection<R>>|mongo.DbCollectionOptions, callback?: MongoCallback<MockMongoCollection<R>>): MockMongoCollection<R> {
		const collection = this._getCollection<R>(name);
		if (callback) {
			callback(null!, collection);
		} else if (typeof callbackOrOptions === 'function') {
			callbackOrOptions(null!, collection);
		}

		return collection;
	}
}

export function getMockPasswordMeta(): APISuccessfulReturns['/api/password/allmeta']['encrypted'] {
	return encryptWithPublicKey(JSON.stringify([{
		id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedPassword>,
		websites: [{
			host: 'www.google.com',
			exact: 'www.google.com/login'
		}],
		twofactor_enabled: false
	}, {
		id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedPassword>,
		websites: [{
			host: 'www.facebook.com',
			exact: 'www.facebook.com/login'
		}, {
			host: 'www.instagram.com',
			exact: 'www.instagram.com/login'
		}, {
			host: 'www.whatsapp.com',
			exact: 'www.whatsapp.com/somelogin'
		}],
		twofactor_enabled: false
	}, {
		id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedPassword>,
		websites: [{
			host: 'www.google.com',
			exact: 'www.google.com/login'
		}],
		twofactor_enabled: true
	}, {
		id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedPassword>,
		websites: [{
			host: 'www.reddit.com',
			exact: 'www.reddit.com/login'
		}],
		twofactor_enabled: false
	}, {
		id: new mongo.ObjectId().toHexString() as StringifiedObjectId<EncryptedPassword>,
		websites: [{
			host: 'www.somebigwebsite.com',
			exact: `www.somebigwebsite.com/${
				genRandomString(50)}/${
					genRandomString(50)}/${
						genRandomString(50)}`
		}],
		twofactor_enabled: false
	}]), 'dev_public_key');
}