import { InstancePublicKey, ServerPublicKey, ServerPrivateKey } from '../database/db-types';
import { ENCRYPTION_ALGORITHM } from './constants';
import { genRandomString } from './util';
import NodeRSA = require('node-rsa');
import crypto = require('crypto');

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
export type EncryptionAlgorithm = 'aes-256-ctr'|'RSA';

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

export enum ERRS {
	INVALID_DECRYPT
}

export function pad<T extends string, P extends Paddings>(data: T, padding: P): Padded<T, P> {
	return `${data}${padding}` as Padded<T, P>;
}

export function hash<T extends string, A extends HashingAlgorithms = 'sha512'>(data: T, 
	algorithm: A = 'sha512' as A): Hashed<T, A> {
		const hash = crypto.createHash(algorithm);
		hash.update(data);
		return hash.digest('hex') as Hashed<T, A>;
	}

export function encryptWithSalt<T, A extends EncryptionAlgorithm, K extends string>(data: T, 
	key: K, algorithm: A): {
		data: SaltEncrypted<T, K, A>
		algorithm: A;
	} {
		const salt = genRandomString(Math.floor(Math.random() * 50));
		const paddedData = JSON.stringify({
			padded: JSON.stringify(data) + salt,
			salt: salt
		});

		return encrypt(paddedData, key, algorithm) as {
			data: SaltEncrypted<T, K, A>
			algorithm: A;
		};
	}

export function decryptWithSalt<T, A extends EncryptionAlgorithm, K extends string>(data: {
	data: SaltEncrypted<T, K, A>
	algorithm: A;
}, key: K): T|ERRS {
	const decrypted = decrypt(data, key);
	if (decrypted === ERRS.INVALID_DECRYPT) {
		return ERRS.INVALID_DECRYPT;
	}
	const { salt, padded: salted } = JSON.parse(decrypted);
	const unsalted = salted.slice(0, salted.length - salt.length);
	try {
		return JSON.parse(unsalted);
	} catch(e) {
		return ERRS.INVALID_DECRYPT;
	}
}

export function encryptBuffer<T extends Buffer, A extends EncryptionAlgorithm, K extends string>(buf: T, key: K,
	algorithm: A): {
		data: Buffer;
		algorithm: A;
	} {
		const iv = crypto.randomBytes(16);
		const enckey = hash(key).slice(0, 32);
		const cipher = crypto.createCipheriv(algorithm, enckey, iv);
		const ciphertext = cipher.update(buf);
		const finalText = Buffer.concat([iv, ciphertext, cipher.final()]);	

		return {
			data: finalText,
			algorithm: algorithm
		 } as {
			data: Buffer;
			algorithm: A;
		};
	}

export function decryptBuffer<T extends string, A extends EncryptionAlgorithm, K extends string>({
	data, algorithm
}: {
	data: Buffer;
	algorithm: A;
}, key: K): T {
	const iv = data.slice(0, 16);
	const decipher = crypto.createDecipheriv(algorithm, hash(key).slice(0, 32), iv);
	const plaintext = decipher.update(data.slice(16));
	
	return plaintext.toString() + decipher.final() as T;
}

export function encrypt<T, A extends EncryptionAlgorithm, K extends string>(data: T, key: K, algorithm: A): {
	data: Encrypted<EncodedString<T>, K, A>;
	algorithm: A;
} {
	const iv = crypto.randomBytes(16);
	const plaintext = Buffer.from(JSON.stringify(data));
	const enckey = hash(key).slice(0, 32);
	const cipher = crypto.createCipheriv(algorithm, enckey, iv);
	const ciphertext = cipher.update(plaintext);
	const finalText = Buffer.concat([iv, ciphertext, cipher.final()]);

	return {
		data: finalText.toString('base64'),
		algorithm: algorithm
	 } as {
		data: Encrypted<EncodedString<T>, K, A>;
		algorithm: A;
	};
}

export function decrypt<T, A extends EncryptionAlgorithm, K extends string>({ data, algorithm }: {
	data: Encrypted<EncodedString<T>, K, A>;
	algorithm: A;
}, key: K): T|ERRS {
	const input = Buffer.from(data, 'base64');
	const iv = input.slice(0, 16);
	const ciphertext = input.slice(16);
	const decipher = crypto.createDecipheriv(algorithm, hash(key).slice(0, 32), iv);
	const plaintext = decipher.update(ciphertext);
	
	const final = plaintext.toString() + decipher.final();
	try {
		return JSON.parse(final);
	} catch(e) {
		return ERRS.INVALID_DECRYPT;
	}
}

export function encryptWithPublicKey<T, K extends InstancePublicKey|ServerPublicKey>(data: T, 
	publicKey: K): Encrypted<EncodedString<T>, K, 'RSA'> {
		const key = new NodeRSA();
		key.importKey(publicKey, 'pkcs8-public-pem');

		return key.encrypt(JSON.stringify(data), 'base64') as 
			Encrypted<EncodedString<T>, K, 'RSA'>;
	}

export function decryptWithPrivateKey<T, K extends ServerPrivateKey>(data: Encrypted<EncodedString<T>, 
	InstancePublicKey|ServerPublicKey, 'RSA'>, 
		privateKey: K): T {
			const key = new NodeRSA();
			key.importKey(privateKey, 'pkcs1-pem');
			return JSON.parse(key.decrypt(data, 'base64'));
		}

export function genRSAKeyPair() {
	const key = new NodeRSA({
		b: 512
	});
	return {
		publicKey: key.exportKey('pkcs8-public-pem'),
		privateKey: key.exportKey('pkcs1-pem')
	}
}