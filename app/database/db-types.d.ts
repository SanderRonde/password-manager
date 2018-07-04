import { Encrypted, Hashed, Padded, MasterPasswordVerificatonPadding, MasterPasswordDecryptionpadding, SaltEncrypted, EncryptionAlgorithm } from "../lib/crypto";
import mongo = require('mongodb');

//Database stuff
export type MongoRecord<T> = T & {
	_id: TypedObjectID<T>;
}

export declare class TypedObjectID<T> extends mongo.ObjectID { 
	constructor(id?: StringifiedObjectId<T>);

	toHexString(): StringifiedObjectId<T>;
}

export type DatabaseEncrypted<T> = {
	data: Encrypted<T, DatabaseKey>;
	algorithm: EncryptionAlgorithm;
}

export type DatabaseEncryptedWithSalt<T> = {
	data: SaltEncrypted<T, DatabaseKey>;
	algorithm: EncryptionAlgorithm;
}

//Keys
export type DatabaseKey = string;
export type MasterPassword = string;
export type PublicKey = string;
export type ResetKey = string;

//Account
export interface EncryptedAccount {
	email: DatabaseEncrypted<EncodedString<string>>;
	twofactor_enabled: DatabaseEncryptedWithSalt<boolean>;
	twofactor_secret: DatabaseEncrypted<EncodedString<string>>;
	pw: DatabaseEncrypted<EncodedString<Hashed<Padded<MasterPassword, 
		MasterPasswordVerificatonPadding>>>>;
	masterpassword: DatabaseEncrypted<EncodedString<{
		data: Encrypted<EncodedString<{
			integrity: true;
			pw: MasterPassword;
		}>, ResetKey>;
		algorithm: EncryptionAlgorithm;
	}>>;
}

export interface DecryptedAccount {
	email: string;
	twofactor_verified: boolean;
	twofactor_secret: string
	pw: Hashed<Padded<MasterPassword, MasterPasswordVerificatonPadding>>;
	masterpassword: {
		data: Encrypted<EncodedString<{
			integrity: true;
			pw: MasterPassword;
		}>, ResetKey>;
		algorithm: EncryptionAlgorithm;
	};
}

//Instance
export type EncryptedInstance = {
	twofactor_enabled: DatabaseEncryptedWithSalt<boolean>;
	public_key: DatabaseEncrypted<EncodedString<string>>; 
	user_id: DatabaseEncrypted<EncodedString<StringifiedObjectId<EncryptedAccount>>>;
};

export type DecryptedInstance = {
	twofactor_enabled: boolean;
	public_key: string;
	user_id: StringifiedObjectId<EncryptedAccount>;
}

export type StringifiedObjectId<T> = string & {
	__id: TypedObjectID<T>;
}

//Password
export interface EncryptedPassword {
	user_id: DatabaseEncrypted<EncodedString<StringifiedObjectId<EncryptedAccount>>>;
	websites: {
		host: DatabaseEncrypted<EncodedString<string>>;
		exact: DatabaseEncrypted<EncodedString<string>>;
	}[];
	twofactor_enabled: DatabaseEncryptedWithSalt<boolean>;
	encrypted: DatabaseEncrypted<EncodedString<{
		data: Encrypted<EncodedString<{
			username: string;
			password: string;
			notes: string[];
		}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
		algorithm: EncryptionAlgorithm;
	}>>;
}

export interface DecryptedPassword {
	user_id: StringifiedObjectId<EncryptedAccount>;
	websites: {
		host: string;
		exact: string;
	}[];
	twofactor_enabled: boolean;
	encrypted: {
		data: Encrypted<EncodedString<{
			username: string;
			password: string;
			notes: string[];
		}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
		algorithm: EncryptionAlgorithm;
	}
}