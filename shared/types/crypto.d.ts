import { StringifiedObjectId, TypedObjectID } from './db-types'

/**
 * A token used for logging in
 */
export type APIToken = string;
/**
 * A token used to verify 2FA access
 */
export type TwofactorVerifyToken = string;

type ToTypedObjectID<T> = T extends StringifiedObjectId<infer V> ?
	TypedObjectID<V> : TypedObjectID<void>;

export type UnstringifyObjectIDs<T> = {
	[P in keyof T]: T[P] extends StringifiedObjectId<any> ? 
		ToTypedObjectID<T[P]> : T[P];
}

/**
 * The encryption algorithm used by default
 */
export type ENCRYPTION_ALGORITHM = 'aes-256-ctr';

/**
 * Data (T) that is encrypted with key (K) using algorithm (A)
 */
export type Encrypted<T, K, A extends EncryptionAlgorithm = ENCRYPTION_ALGORITHM> = string & {
	__encrypted: T;
	__key: K;
	__algorithm: A;
}

/**
 * Data (T) that is encrypted with key (K) using algorithm (A) and salted
 */
export type SaltEncrypted<T, K, A extends EncryptionAlgorithm = ENCRYPTION_ALGORITHM> = Encrypted<EncodedString<
	EncodedString<{
		padded: string;
		salt: string;
		__data: T;
	}>>, K, A>;

/**
 * Hashing algorithms that can be used (among others)
 */
export type HashingAlgorithms = 'sha256'|'sha512';
/**
 * Encryption algorithms that can be used (among others)
 */
export type EncryptionAlgorithm = 'aes-256-ctr';

/**
 * Data (T) that is hashed an algorithm (A)
 */
export type Hashed<T, A extends HashingAlgorithms = 'sha512'> = string & {
	__hashed: T;
	__agorithm: A;
}

/**
 * The padding that, padded to the master password and hashed
 * can be used to verify a login
 */
export type MasterPasswordVerificationPadding = 'masterpwverify';
/**
 * The padding that, padded to the master password and hashed
 * can be used to decrypt a user password
 */
export type MasterPasswordDecryptionpadding = 'masterpwdecrypt';
/**
 * The available paddings
 */
export type Paddings = MasterPasswordVerificationPadding | 
	MasterPasswordDecryptionpadding;

/**
 * A string (T) padded with padding (P). Basically T+P
 */
export type Padded<T extends string, P extends Paddings> = string & {
	__base: T;
	__padding: P;
}

export const enum ERRS {
	INVALID_DECRYPT = 'ERR_INVALID_DECRYPT',
	INVALID_PARSE = 'ERR_INVALID_PARSE'
}