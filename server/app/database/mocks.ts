import { MongoCallback, FilterQuery, CommonOptions, DeleteWriteOpResultObject, FindAndModifyWriteOpResultObject, FindOneAndReplaceOption, InsertOneWriteOpResult, CollectionInsertOneOptions, FindOneOptions } from 'mongodb';
import { TypedObjectID } from './../../../shared/types/db-types';
import * as mongo from 'mongodb'

interface TypedCursor<C> {
	toArray(): Promise<C[]>;
	toArray(callback: MongoCallback<C[]>): void;
}

class MockCursor<C> implements TypedCursor<C> {
	toArray(): Promise<C[]>;
	toArray(callback: MongoCallback<C[]>): void;
	toArray(callback?: MongoCallback<C[]>): Promise<C[]>|void {
		if (callback) {
			callback(null!, []);
		} else {
			return Promise.resolve([]);
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
	constructor(name: string) {
		this.collectionName = name;
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
	findOne<T = R>(_filter: {
		_id: TypedObjectID<T>;
	} | mongo.FilterQuery<R>, optionsOrCallback?: mongo.MongoCallback<T | null> | mongo.FindOneOptions, callback?: mongo.MongoCallback<T | null>): void | Promise<T | null> {
		if (callback) {
			callback(null!, null);
		}
		else if (typeof optionsOrCallback === 'function') {
			optionsOrCallback(null!, null);
		}
		else {
			return Promise.resolve(null);
		}
	}
	count(callback: MongoCallback<number>): void;
	count(query: Object, callback: MongoCallback<number>): void;
	count(query?: Object, options?: mongo.MongoCountPreferences): Promise<number>;
	count(query: Object, options: mongo.MongoCountPreferences, callback: MongoCallback<number>): void;
	count(callbackOrQuery: MongoCallback<number> | Object, callbackOrOptions?: MongoCallback<number> | mongo.MongoCountPreferences, callback?: MongoCallback<number>): Promise<number> | void {
		if (callback) {
			callback(null!, 0);
		}
		else if (typeof callbackOrOptions === 'function') {
			callbackOrOptions(null!, 0);
		}
		else if (typeof callbackOrQuery === 'function') {
			callbackOrQuery(null!, 0);
		}
		else {
			return Promise.resolve(0);
		}
	}
	deleteMany(filter: FilterQuery<R>, callback: MongoCallback<DeleteWriteOpResultObject>): void;
	deleteMany(filter: FilterQuery<R>, options?: CommonOptions): Promise<DeleteWriteOpResultObject>;
	deleteMany(filter: FilterQuery<R>, options: CommonOptions, callback: MongoCallback<DeleteWriteOpResultObject>): void;
	deleteMany(_filter: FilterQuery<R>, callbackOrOptions?: MongoCallback<DeleteWriteOpResultObject> | CommonOptions, callback?: MongoCallback<DeleteWriteOpResultObject>): Promise<DeleteWriteOpResultObject> | void {
		if (callback) {
			callback(null!, {
				result: {
					ok: undefined,
					n: 0
				},
				deletedCount: 0
			});
		}
		else if (typeof callbackOrOptions === 'function') {
			callbackOrOptions(null!, {
				result: {
					ok: undefined,
					n: 0
				},
				deletedCount: 0
			});
		}
		else {
			return Promise.resolve({
				result: {
					ok: undefined,
					n: 0
				},
				deletedCount: 0
			});
		}
	}

	deleteOne(filter: FilterQuery<R>, callback: MongoCallback<DeleteWriteOpResultObject>): void;
    deleteOne(filter: FilterQuery<R>, options?: CommonOptions & { bypassDocumentValidation?: boolean }): Promise<DeleteWriteOpResultObject>;
	deleteOne(filter: FilterQuery<R>, options: CommonOptions & { bypassDocumentValidation?: boolean }, callback: MongoCallback<DeleteWriteOpResultObject>): void;
	deleteOne(_filter: FilterQuery<R>, optionsOrCallback?: CommonOptions & { bypassDocumentValidation?: boolean }|MongoCallback<DeleteWriteOpResultObject>, callback?: MongoCallback<DeleteWriteOpResultObject>): Promise<DeleteWriteOpResultObject>|void {
		if (callback) {
			callback(null!, {
				result: {
					ok: undefined
				}
			});
		} else if (typeof optionsOrCallback === 'function') {
			optionsOrCallback(null!, {
				result: {
					ok: undefined
				}
			});
		} else {
			return Promise.resolve({
				result: {
					ok: undefined
				}
			});
		}
	}
	
	find<T = R>(query?: FilterQuery<R>): TypedCursor<T>;
	find<T = R>(query: FilterQuery<R>, options?: FindOneOptions): TypedCursor<T>;
	find<T = R>(_query?: FilterQuery<R>, _options?: FindOneOptions): TypedCursor<T> {
		return new MockCursor<T>();
	}

	findOneAndUpdate(filter: FilterQuery<R>, update: Object, callback: MongoCallback<FindAndModifyWriteOpResultObject<R>>): void;
    findOneAndUpdate(filter: FilterQuery<R>, update: Object, options?: mongo.FindOneAndReplaceOption): Promise<FindAndModifyWriteOpResultObject<R>>;
	findOneAndUpdate(filter: FilterQuery<R>, update: Object, options: FindOneAndReplaceOption, callback: MongoCallback<FindAndModifyWriteOpResultObject<R>>): void;
	findOneAndUpdate(_filter: FilterQuery<R>, _update: Object, optionsOrCallback?: FindOneAndReplaceOption|MongoCallback<FindAndModifyWriteOpResultObject<R>>, callback?: MongoCallback<FindAndModifyWriteOpResultObject<R>>): void|Promise<FindAndModifyWriteOpResultObject<R>> {
		if (callback) {
			callback(null!, {
				ok: undefined
			});
		} else if (typeof optionsOrCallback === 'function') {
			optionsOrCallback(null!, {
				ok: undefined
			});
		} else {
			return Promise.resolve({
				ok: undefined
			});
		}
	}
	
	insertOne(docs: Object, callback: MongoCallback<InsertOneWriteOpResult>): void;
    insertOne(docs: Object, options?: CollectionInsertOneOptions): Promise<InsertOneWriteOpResult>;
	insertOne(docs: Object, options: CollectionInsertOneOptions, callback: MongoCallback<InsertOneWriteOpResult>): void;
	insertOne(_docs: Object, optionsOrCallback?: CollectionInsertOneOptions|MongoCallback<InsertOneWriteOpResult>, callback?: MongoCallback<InsertOneWriteOpResult>): void|Promise<InsertOneWriteOpResult> {
		if (callback) {
			callback(null!, {
				result: {
					ok: 0,
					n: 0
				},
				insertedCount: 0,
				ops: [],
				insertedId: new mongo.ObjectId(),
				connection: ''
			});
		} else if (typeof optionsOrCallback === 'function') {
			optionsOrCallback(null!, {
				result: {
					ok: 0,
					n: 0
				},
				insertedCount: 0,
				ops: [],
				insertedId: new mongo.ObjectId(),
				connection: ''
			});
		} else {
			return Promise.resolve({
				result: {
					ok: 0,
					n: 0
				},
				insertedCount: 0,
				ops: [],
				insertedId: new mongo.ObjectId(),
				connection: ''
			});
		}
	}
}

export class MockMongoDb {
	collection<R = any>(name: string): MockMongoCollection<R>;
    collection<R = any>(name: string, callback: MongoCallback<MockMongoCollection<R>>): MockMongoCollection<R>;
	collection<R = any>(name: string, options: mongo.DbCollectionOptions, callback: MongoCallback<MockMongoCollection<R>>): MockMongoCollection<R>;
	collection<R = any>(name: string, callbackOrOptions?: MongoCallback<MockMongoCollection<R>>|mongo.DbCollectionOptions, callback?: MongoCallback<MockMongoCollection<R>>): MockMongoCollection<R> {
		const collection = new MockMongoCollection<R>(name);
		if (callback) {
			callback(null!, collection);
		} else if (typeof callbackOrOptions === 'function') {
			callbackOrOptions(null!, collection);
		}

		return collection;
	}
}