import { PublicKey } from '../database/dbtypes';
import NodeRSA = require('node-rsa');
import crypto = require('crypto');

export type Encrypted<T, K> = string & {
	__encrypted: T;
	__key: K;
}

//Among others
export type HashingAlgorithms = 'sha256'|'sha512'

export type Hashed<T, A extends HashingAlgorithms> = string & {
	__hashed: T;
	__agorithm: A;
}

export function hash<T extends string, A extends HashingAlgorithms = 'sha512'>(data: T, 
	algorithm: A = 'sha512' as A): Hashed<T, A> {
		const hash = crypto.createHash(algorithm);
		hash.update(data);
		return hash.digest('hex') as Hashed<T, A>;
	}

export function encrypt<T, A extends string>(data: T, key: string, algorithm: A): {
	data: Encrypted<EncodedString<T>, A>;
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
		data: Encrypted<EncodedString<T>, A>;
		algorithm: A;
	};
}

export function decrypt<T, A extends string>({ data, algorithm }: {
	data: string;
	algorithm: A;
}, key: string): T {
	const input = new Buffer(data, 'base64');
	const iv = input.slice(0, 16);
	const ciphertext = input.slice(16);
	const decipher = crypto.createDecipheriv(algorithm, hash(key), iv);
	const plaintext = decipher.update(ciphertext);

	return JSON.parse(plaintext.toString() + decipher.final());
}

export function encryptWithPublicKey<T>(publicKey: string, 
	data: T): Encrypted<EncodedString<T>, PublicKey> {
		const key = new NodeRSA();
		key.importKey(publicKey, 'public');

		return key.encrypt(JSON.stringify(data), 'base64') as 
			Encrypted<EncodedString<T>, PublicKey>;
	}