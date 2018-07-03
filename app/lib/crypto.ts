import { PublicKey } from '../database/db-types';
import { genRandomString } from './util';
import NodeRSA = require('node-rsa');
import crypto = require('crypto');
import { CONSTANTS } from './constants';

export type Encrypted<T, K, A extends EncryptionAlgorithm = CONSTANTS['algorithm']> = string & {
	__encrypted: T;
	__key: K;
	__algorithm: A;
}

export type SaltEncrypted<T, K, A extends EncryptionAlgorithm = CONSTANTS['algorithm']> = Encrypted<EncodedString<
	EncodedString<{
		padded: string;
		salt: string;
		__data: T;
	}>>, K, A>;

//Among others
export type HashingAlgorithms = 'sha256'|'sha512';
export type EncryptionAlgorithm = 'aes-256-ctr'|'RSA';

export type Hashed<T, A extends HashingAlgorithms = 'sha512'> = string & {
	__hashed: T;
	__agorithm: A;
}

export type MasterPasswordVerificatonPadding = 'masterpwverify';
export type MasterPasswordDecryptionpadding = 'masterpwdecrypt';
export type Paddings = MasterPasswordVerificatonPadding | 
	MasterPasswordDecryptionpadding;

export type Padded<T extends string, P extends Paddings> = string & {
	__base: T;
	__padding: P;
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
}, key: K): T {
	const decrypted = decrypt(data, key);
	const { salt, padded: salted } = JSON.parse(decrypted);
	const unsalted = salted.slice(0, salted.length - salt.length);
	return JSON.parse(unsalted);
}

export function encrypt<T, A extends EncryptionAlgorithm, K extends string>(data: T, key: K, algorithm: A): {
	data: Encrypted<EncodedString<T>, K, A>;
	algorithm: A;
} {
	const iv = crypto.randomBytes(16);
	const plaintext = new Buffer(JSON.stringify(data));
	const cipher = crypto.createCipheriv(algorithm, hash(key), iv);
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
}, key: K): T {
	const input = new Buffer(data, 'base64');
	const iv = input.slice(0, 16);
	const ciphertext = input.slice(16);
	const decipher = crypto.createDecipheriv(algorithm, hash(key), iv);
	const plaintext = decipher.update(ciphertext);

	return JSON.parse(plaintext.toString() + decipher.final());
}

export function encryptWithPublicKey<T>(data: T, 
	publicKey: string): Encrypted<EncodedString<T>, PublicKey, 'RSA'> {
		const key = new NodeRSA();
		key.importKey(publicKey, 'public');

		return key.encrypt(JSON.stringify(data), 'base64') as 
			Encrypted<EncodedString<T>, PublicKey, 'RSA'>;
	}