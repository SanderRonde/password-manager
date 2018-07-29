import { Database, COLLECTIONS, TypedCollection } from "../database";
import { EncryptedAccount, EncryptedInstance, EncryptedPassword, MongoRecord, TypedObjectID, StringifiedObjectId } from "../db-types";
import mongo = require('mongodb');


interface EncryptedCollectionRecords {
	[COLLECTIONS.USERS]: EncryptedAccount;
	[COLLECTIONS.INSTANCES]: EncryptedInstance;
	[COLLECTIONS.PASSWORDS]: EncryptedPassword;
}

type ToTypedObjectID<T> = T extends StringifiedObjectId<infer V> ?
	TypedObjectID<V> : TypedObjectID<void>;

export type UnstringifyObjectIDs<T> = {
	[P in keyof T]: T[P] extends StringifiedObjectId<any> ? 
		ToTypedObjectID<T[P]> : T[P];
}

export class DatabaseManipulation {
	constructor(private _parent: Database) {

	}

	private _getCollection<C extends COLLECTIONS>(collection: C): TypedCollection<EncryptedCollectionRecords[C]>|null {
		switch (collection) {
			case COLLECTIONS.USERS:
				return this._parent.collections.users;
			case COLLECTIONS.INSTANCES:
				return this._parent.collections.instances;
			case COLLECTIONS.PASSWORDS:
				return this._parent.collections.passwords;
		}
		this._parent.err('Could not find given collection');
		return null;
	}

	public async insertOne<R extends EncryptedCollectionRecords[C], 
		C extends COLLECTIONS>(collectionName: C, record: UnstringifyObjectIDs<R>) {
			const collection = this._getCollection(collectionName);
			if (!collection) {
				return;
			}

			const { result: { ok } } = await collection.insertOne(record);
			if (!ok) {
				this._parent.err('Failed to insert record into the database');
				return false;
			}
			return true;
		}

	public async findOne<R extends UnstringifyObjectIDs<EncryptedCollectionRecords[C]>, 
		C extends COLLECTIONS>(collectionName: C, 
			filter: Partial<R>|mongo.FilterQuery<R>): Promise<MongoRecord<R> | null> {
				const collection = this._getCollection(collectionName);
				if (!collection) {
					return null;
				}

				const record = await collection.findOne(filter);
				if (record) {
					return record as any;
				}
				return null;
			}
	
	public async findMany<R extends EncryptedCollectionRecords[C], 
		C extends COLLECTIONS>(collectionName: C, 
			filter: Partial<R>|mongo.FilterQuery<R>): Promise<MongoRecord<R>[]|null> {
				const collection = this._getCollection(collectionName);
				if (!collection) {
					return null;
				}

				try {
					return await (await collection.find(filter)).toArray() as MongoRecord<R>[];
				} catch(e) {
					return null;
				}
			}

	public async deleteOne<R extends UnstringifyObjectIDs<EncryptedCollectionRecords[C]>, 
		C extends COLLECTIONS>(collectionName: C, filter: R|mongo.FilterQuery<R>): Promise<boolean> {
			const collection = this._getCollection(collectionName);
			if (!collection) {
				return false;
			}

			const {  result: { ok } } = await collection.deleteOne(filter);
			if (!ok) {
				this._parent.err('Failed to delete record');
				return false;
			}
			return true;
		}

	public async deleteMany<R extends UnstringifyObjectIDs<EncryptedCollectionRecords[C]>, 
		C extends COLLECTIONS>(collectionName: C, filter: R|mongo.FilterQuery<R>): Promise<boolean> {
			const collection = this._getCollection(collectionName);
			if (!collection) {
				return false;
			}

			const { deletedCount } = await collection.deleteMany(filter);
			if (!deletedCount) {
				this._parent.err('Failed to delete record');
				return false;
			}
			return true;
		}

	public async findAndUpdateOne<R extends UnstringifyObjectIDs<EncryptedCollectionRecords[C]>, 
		C extends COLLECTIONS>(collectionName: C, filter: R|mongo.FilterQuery<R>,
			update: Partial<R>): Promise<boolean> {
				const collection = this._getCollection(collectionName);
				if (!collection) {
					return false;
				}

				try {
					const { ok } = await collection.findOneAndUpdate(filter, {
						"$set": update
					});
					if (ok) {
						return true;
					}
				} catch(e) { 
					this._parent.err(e.message);
				}
				this._parent.err('Failed to update record');
				return false;
			}
		
	public async getAll<R extends EncryptedCollectionRecords[C], 
		C extends COLLECTIONS>(collectionName: C): Promise<MongoRecord<R>[]|null> {
			const collection = this._getCollection(collectionName);
			if (!collection) {
				return null;
			}

			try {
				return await collection.find().toArray() as MongoRecord<R>[];
			} catch(e) {
				this._parent.err(e.message);
			}
			return null;
		}
}