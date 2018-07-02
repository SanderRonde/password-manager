import { Database, COLLECTIONS, TypedCollection } from "../database";
import { EncryptedAccount, Instance, EncryptedPassword, MongoRecord } from "../dbtypes";
import mongo = require('mongodb');


interface EncryptedCollectionRecords {
	[COLLECTIONS.USERS]: EncryptedAccount;
	[COLLECTIONS.INSTANCES]: Instance;
	[COLLECTIONS.PASSWORDS]: EncryptedPassword;
}

export class DatabaseManipulation {
	constructor(private _parent: Database) {

	}

	private _getCollection<C extends COLLECTIONS>(collection: C): TypedCollection<EncryptedCollectionRecords[C]> {
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
		C extends COLLECTIONS>(collectionName: C, record: R) {
			const collection = this._getCollection(collectionName);
			if (!collection) {
				return;
			}

			const { result: { ok } } = await collection.insertOne(record);
			if (!ok) {
				this._parent.err('Failed to insert record into the database');
			}
		}

	public async findOne<R extends EncryptedCollectionRecords[C], 
		C extends COLLECTIONS>(collectionName: C, 
			filter: Partial<R>|mongo.FilterQuery<R>): Promise<MongoRecord<R> | null> {
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
				this._parent.err('Failed to delete record');
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
				this._parent.err('Failed to delete record');
			}
		}

	public async findAndUpdateOne<R extends EncryptedCollectionRecords[C], 
		C extends COLLECTIONS>(collectionName: C, filter: R|mongo.FilterQuery<R>,
			update: Partial<R>): Promise<void> {
				const collection = this._getCollection(collectionName);
				if (!collection) {
					return;
				}

				const { ok } = await collection.findOneAndUpdate(filter, update);
				if (!ok) {
					this._parent.err('Failed to delete record');
				}
			}
}