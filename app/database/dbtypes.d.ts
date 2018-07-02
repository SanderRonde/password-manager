import { Encrypted, Hashed, Padded, MasterPasswordVerificatonPadding } from "../lib/crypto";
import mongo = require('mongodb');

//Database stuff
export type MongoRecord<T> = T & {
	_id: TypedObjectID<T>;
}

export declare class TypedObjectID<T> extends mongo.ObjectID { 
	toHexString(): StringifiedObjectId<T>;
}

export type DatabaseEncrypted<T> = {
	data: Encrypted<T, DatabaseKey>;
	algorithm: string;
	__data: T;
}

//Keys
export type DatabaseKey = string;
export type MasterPassword = string;
export type PublicKey = string;

//Account
export interface EncryptedAccount {
	email: DatabaseEncrypted<EncodedString<string>>;
	pw: DatabaseEncrypted<EncodedString<Hashed<Padded<MasterPassword, 
		MasterPasswordVerificatonPadding>>>>;
}

export interface DecryptedAccount {
	email: string;
	pw: Padded<MasterPassword, MasterPasswordVerificatonPadding>;
}

//Instance
export type Instance = {
	twofactor_enabled: boolean;
	twofactor_secret: DatabaseEncrypted<EncodedString<string>>;
	public_key: DatabaseEncrypted<EncodedString<string>>; 
	user_id: TypedObjectID<EncryptedAccount>;
};

type StringifiedObjectId<T> = string & {
	__id: TypedObjectID<T>;
}

//Password
export interface EncryptedPassword {
	user_id: DatabaseEncrypted<EncodedString<StringifiedObjectId<EncryptedAccount>>>;
	websites: DatabaseEncrypted<EncodedString<string>>[];
	encrypted: DatabaseEncrypted<EncodedString<{
		username: string;
		encrypted: Encrypted<EncodedString<{
			password: string;
			notes: string[];
		}>, Hashed<Padded<MasterPassword, MasterPasswordVerificatonPadding>>>;
	}>>;
}

export interface DecryptedPassword {
	user_id: TypedObjectID<EncryptedAccount>;
	websites: string[];
	username: string;
	encrypted: Encrypted<EncodedString<{
		password: string;
		notes: string[];
}>, Hashed<Padded<MasterPassword, MasterPasswordVerificatonPadding>>>;
}