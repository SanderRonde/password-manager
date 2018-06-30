import crypto = require('crypto');
import { Hashed } from '../database/database';

export function hash<T extends string>(data: T, algorithm: string = 'sha512'): Hashed<T> {
	const hash = crypto.createHash(algorithm);
	hash.update(data);
	return hash.digest('hex') as Hashed<T>;
}

export function encrypt<T, A extends string>(data: T, key: string, algorithm: A): {
	data: EncodedString<T>;
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
		data: EncodedString<T>;
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