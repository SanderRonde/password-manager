/// <reference path="../../typings/global.d.ts" />
import { Encrypted, EncryptionAlgorithm, SaltEncrypted, Hashed, MasterPasswordVerificationPadding, Padded, MasterPasswordDecryptionpadding } from './crypto';
import * as mongo from 'mongodb'

/**
 * A mongo record, has a _id property
 */
export type MongoRecord<T> = T & {
	/**
	 * The ID of this record
	 */
	_id: TypedObjectID<T>;
}

/**
 * An object ID used to index the database
 */
export declare class TypedObjectID<T> extends mongo.ObjectID { 
	constructor(id?: StringifiedObjectId<T>);

	toHexString(): StringifiedObjectId<T>;
}

/**
 * Data encrypted with the database key
 */
export type DatabaseEncrypted<T> = {
	/**
	 * The data that is encrypted
	 */
	data: Encrypted<T, DatabaseKey>;
	/**
	 * The algorithm used
	 */
	algorithm: EncryptionAlgorithm;
}

/**
 * Data encrypted with the database key with added salt
 */
export type DatabaseEncryptedWithSalt<T> = {
	/**
	 * The data that is encrypted
	 */
	data: SaltEncrypted<T, DatabaseKey>;
	/**
	 * The algorithm used
	 */
	algorithm: EncryptionAlgorithm;
}

/**
 * Data encrypted using a public key, automatically hybrid encrypted
 *  if message is too long
 */
export type PublicKeyEncrypted<T, K extends string> = EncodedString<{
	/**
	 * The type of encryption (async or hybrid)
	 */
	type: 'async';
	/**
	 * The async encrypted data
	 */
	data: RSAEncrypted<EncodedString<T>, K>;
}|{
	/**
	 * The type of encryption (async or hybrid)
	 */
	type: 'hybrid';
	/**
	 * The hybrid encrypted data
	 */
	data: HybridEncrypted<T, K>;
}>;

type UnType<T> = T extends (string & {
	__type: infer R
}) ? R : T;

export type PublicKeyDecrypted<T> = UnType<T extends PublicKeyEncrypted<infer D, string> ? 
	D : void>

/**
 * Data encrypted with a public key
 */
export type RSAEncrypted<T, K extends string> = string & {
	/**
	 * The data that is encrypted
	 */
	__data: T;
	/**
	 * The key used to encrypt it
	 */
	__key: K;
}

/**
 * Data encrypted with both a symmetric and asynchronous key
 */
export type HybridEncrypted<T, K extends string, S = string> = EncodedString<{
	/**
	 * The original data, symmetrically encrypted with the symmetric key
	 */
	data: Encrypted<EncodedString<T>, S>;
	/**
	 * The key to the data, encrypted with the asynchronous key
	 */
	symmetricKey: RSAEncrypted<EncodedString<S>, K>;
}>;

//Keys
/**
 * The key to decrypt the database
 */
export type DatabaseKey = string;
/**
 * A key used by an account to decrypt their password and to log in
 */
export type MasterPassword = string;
/**
 * The public key of an instance
 */
export type InstancePublicKey = string;
/**
 * The public key of this server for a specific instance
 */
export type ServerPublicKey = string;
/**
 * The private key of this server for a specific instance
 */
export type ServerPrivateKey = string;
/**
 * A key used to reset an account
 */
export type ResetKey = string;

/**
 * An encrypted user account
 */
export interface EncryptedAccount {
	/**
	 * (encrypted) The email of the user
	 */
	email: string;
	/**
	 * (encrypted) Whether 2FA is enbled
	 */
	twofactor_enabled: EncodedString<DatabaseEncryptedWithSalt<boolean>>;
	/**
	 * (encrypted) The 2FA secret used to generate codes
	 */
	twofactor_secret: EncodedString<DatabaseEncryptedWithSalt<string|null>>;
	/**
	 * (encrypted) The master password, padded and hashed
	 */
	pw: EncodedString<DatabaseEncrypted<EncodedString<Hashed<Padded<MasterPassword, 
		MasterPasswordVerificationPadding>>>>>;
	/**
	 * (encrypted) A record that can be decrypted with the reset key
	 * in order to reset the master password
	 */
	reset_key: EncodedString<DatabaseEncrypted<EncodedString<EncodedString<{
		/**
		 * The data that is encrypted
		 */
		data: Encrypted<EncodedString<{
			/**
			 * An integrity verification
			 */
			integrity: true;
			/**
			 * The master password
			 */
			pw: MasterPassword;
		}>, ResetKey>;
		/**
		 * The algorithm used to encrypt the data
		 */
		algorithm: EncryptionAlgorithm;
	}>>>>;
}

/**
 * A decrypted user account
 */
export interface DecryptedAccount {
	/**
	 * The email of the user
	 */
	email: string;
	/**
	 * Whether 2FA is enbled
	 */
	twofactor_enabled: boolean;
	/**
	 * The 2FA secret used to generate codes
	 */
	twofactor_secret: string|null;
	/**
	 * The master password, padded and hashed
	 */
	pw: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
	/**
	 * A record that can be decrypted with the reset key
	 * in order to reset the master password
	 */
	reset_key: EncodedString<{
		/**
		 * The data that is encrypted
		 */
		data: Encrypted<EncodedString<{
			/**
			 * An integrity verification
			 */
			integrity: true;
			/**
			 * The master password
			 */
			pw: MasterPassword;
		}>, ResetKey>;
		/**
		 * The algorithm used to encrypt the data
		 */
		algorithm: EncryptionAlgorithm;
	}>;
}

/**
 * An encrypted instance (endpoint)
 */
export type EncryptedInstance = {
	/**
	 * (encrypted) Whether 2FA is enabled for this instance's login
	 */
	twofactor_enabled: EncodedString<DatabaseEncryptedWithSalt<boolean>>;
	/**
	 * (encrypted) The public key used to encrypt data sent to this instance
	 */
	public_key: EncodedString<DatabaseEncrypted<EncodedString<InstancePublicKey>>>;
	/**
	 * (encrypted) The user ID belonging to this account
	 */
	user_id: TypedObjectID<EncryptedAccount>;
	/**
	 * (encrypted) The private key of this server. Used to decrypt messages by an instance
	 */
	server_private_key: EncodedString<DatabaseEncrypted<EncodedString<ServerPrivateKey>>>;
	/**
	 * (encrypted) When this instance expires (will be near-infinity for non-dashboard instances)
	 */
	expires: EncodedString<DatabaseEncrypted<EncodedString<number>>>;
};

/**
 * A decrypted instance (endpoint)
 */
export type DecryptedInstance = {
	/**
	 * Whether 2FA is enabled for this instance's login
	*/
	twofactor_enabled: boolean;
	/**
	 * The public key used to encrypt data sent to this instance
	 */
	public_key: InstancePublicKey;
	/**
	 * The user ID belonging to this account
	 */
	user_id: TypedObjectID<EncryptedAccount>;
	/**
	 * (encrypted) The private key of this server. Used to decrypt messages by an instance
	 */
	server_private_key: ServerPrivateKey;
	/**
	 * When this instance expires (will be near-infinity for non-dashboard instances)
	 */
	expires: number;
}

/**
 * An object ID in string form. Calling new mongo.ObjectID(key) on it
 * creates a mongodb ObjectID again
 */
export type StringifiedObjectId<T> = string & {
	__id: TypedObjectID<T>;
}

/**
 * An encrypted user password
 */
export interface EncryptedPassword {
	/**
	 * (encrypted) The user ID that this password belongs to
	 */
	user_id: TypedObjectID<EncryptedAccount>;
	/**
	 * (encrypted) The websites for which this password is used
	 */
	websites: {
		/**
		 * (encrypted) The hostname of the URL
		 */
		host: EncodedString<DatabaseEncrypted<EncodedString<string>>>;
		/**
		 * (encrypted) The full URL
		 */
		exact: EncodedString<DatabaseEncrypted<EncodedString<string>>>;
		/**
		 * (encrypted) The (local) path to the favicon for this website
		 */
		favicon: EncodedString<DatabaseEncrypted<EncodedString<StringifiedObjectId<EncryptedAsset>|null>>>;
	}[];
	/**
	 * (encrypted) The username of the website (or group)
	 */
	username: EncodedString<DatabaseEncrypted<EncodedString<string>>>;
	/**
	 * (encrypted) Whether 2FA is enabled for this password
	 */
	twofactor_enabled: EncodedString<DatabaseEncryptedWithSalt<boolean>>;
	/**
	 * (encrypted) Data that is encrypted with the user's 
	 * 	master password and as such is inaccessible to the server
	 */
	encrypted: EncodedString<DatabaseEncrypted<EncodedString<EncodedString<{
		/**
		 * The encrypted data
		 */
		data: Encrypted<EncodedString<{
			/**
			 * The password of the website (or group)
			 */
			password: string;
			/**
			 * Any notes about this website (or group)
			 */
			notes: string[];
		}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
		/**
		 * The algorithm used to encrypt the data
		 */
		algorithm: EncryptionAlgorithm;
	}>>>>;
}

/**
 * A decrypted user password
 */
export interface DecryptedPassword {
	/**
	 * The user ID that this password belongs to
	 */
	user_id: TypedObjectID<EncryptedAccount>;
	/**
	 * The websites for which this password is used
	 */
	websites: {
		/**
		 * The hostname of the URL
		 */
		host: string;
		/**
		 * The full URL
		 */
		exact: string;
		/**
		 * The (local) path to the favicon for this website
		 */
		favicon: StringifiedObjectId<EncryptedAsset>|null|null;
	}[];
	/**
	 * The username of the website (or group)
	 */
	username: string;
	/**
	 * Whether 2FA is enabled for this password
	 */
	twofactor_enabled: boolean;
	/**
	 * Data that is encrypted with the user's 
	 * 	master password and as such is inaccessible to the server
	 */
	encrypted: EncodedString<{
		/**
		 * The encrypted data
		 */
		data: Encrypted<EncodedString<{
			/**
			 * The password of the website (or group)
			 */
			password: string;
			/**
			 * Any notes about this website (or group)
			 */
			notes: string[];
		}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
		/**
		 * The algorithm used to encrypt the data
		 */
		algorithm: EncryptionAlgorithm;
	}>;
}

/**
 * An encrypted asset record
 */
export interface EncryptedAsset {
	/**
	 * The host name associated with this icon
	 */
	host: string;
	/**
	 * (encrypted) An object that maps user IDs to their own icon
	 */
	by_user_id: EncodedString<DatabaseEncrypted<EncodedString<{
		[user_id: string]: string;
	}>>>;
	/**
	 * (encrypted) A default icon to be used if no user-specific icon exists
	 */
	default: EncodedString<DatabaseEncrypted<EncodedString<string|null>>>;
}

/**
 * A decrypted asset record
 */
export interface DecryptedAsset {
	/**
	 * The host name associated with this icon
	 */
	host: string;
	/**
	 * An object that maps user IDs to their own icon
	 */
	by_user_id: {
		[user_id: string]: string;
	};
	/**
	 * A default icon to be used if no user-specific icon exists
	 */
	default: string|null;
}