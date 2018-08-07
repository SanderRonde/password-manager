export { Encrypted, ERRS, SaltEncrypted, EncryptionAlgorithm, Hashed, HashingAlgorithms, MasterPasswordDecryptionpadding, MasterPasswordVerificationPadding, Padded } from '../../../shared/types/crypto'
import { Encrypted, ERRS, SaltEncrypted, EncryptionAlgorithm, Hashed, HashingAlgorithms } from '../../../shared/types/crypto'
import { InstancePublicKey, ServerPublicKey, RSAEncrypted, ServerPrivateKey } from "../../../shared/types/db-types";
import { Padded, Paddings } from "../../../shared/types/crypto";
import { JSEncrypt } from '../libraries/jsencrypt'
import { genRandomString } from './util';
import * as crypto from 'crypto'

export function hash<T extends string, A extends HashingAlgorithms = 'sha512'>(data: T, 
	algorithm: A = 'sha512' as A): Hashed<T, A> {
		const hash = crypto.createHash(algorithm);
		hash.update(data);
		return hash.digest('hex') as Hashed<T, A>;
	}

export function encryptWithSalt<T, A extends EncryptionAlgorithm, K extends string>(data: T, 
	key: K, algorithm: A): EncodedString<{
		data: SaltEncrypted<T, K, A>
		algorithm: A;
	}> {
		const salt = genRandomString(Math.floor(Math.random() * 50));
		const paddedData = JSON.stringify({
			padded: JSON.stringify(data) + salt,
			salt: salt
		});

		return encrypt(paddedData, key, algorithm) as EncodedString<{
			data: SaltEncrypted<T, K, A>
			algorithm: A;
		}>;
	}

export function decryptWithSalt<T, A extends EncryptionAlgorithm, K extends string>(data: EncodedString<{
	data: SaltEncrypted<T, K, A>
	algorithm: A;
}>, key: K): T|ERRS {
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

export function encrypt<T, A extends EncryptionAlgorithm, K extends string>(data: T, key: K, algorithm: A): EncodedString<{
	data: Encrypted<EncodedString<T>, K, A>;
	algorithm: A;
}> {
	const iv = crypto.randomBytes(16);
	const plaintext = Buffer.from(JSON.stringify(data));
	const enckey = hash(key).slice(0, 32);
	const cipher = crypto.createCipheriv(algorithm, enckey, iv);
	const ciphertext = cipher.update(plaintext);
	const finalText = Buffer.concat([iv, ciphertext, cipher.final()]);

	return JSON.stringify({
		data: finalText.toString('base64'),
		algorithm: algorithm
	 } as {
		data: Encrypted<EncodedString<T>, K, A>;
		algorithm: A;
	});
}

export function decrypt<T, A extends EncryptionAlgorithm, K extends string>(encrypted: EncodedString<{
	data: Encrypted<EncodedString<T>, K, A>;
	algorithm: A;
}>, key: K): T|ERRS {
	try {
		const { data, algorithm } = JSON.parse(encrypted);
		const input = Buffer.from(data, 'base64');
		const iv = input.slice(0, 16);
		const ciphertext = input.slice(16);
		const decipher = crypto.createDecipheriv(algorithm, hash(key).slice(0, 32), iv);
		const plaintext = decipher.update(ciphertext);
		
		const final = plaintext.toString() + decipher.final();
		return JSON.parse(final);
	} catch(e) {
		return ERRS.INVALID_DECRYPT;
	}
}

export function encryptWithPublicKey<T, K extends InstancePublicKey|ServerPublicKey>(data: T, 
	publicKey: K): RSAEncrypted<EncodedString<T>, K> {
		const key = new JSEncrypt();
		key.setPublicKey(publicKey);

		return key.encrypt(JSON.stringify(data)) as 
			RSAEncrypted<EncodedString<T>, K>;
	}

export function decryptWithPrivateKey<T, K extends ServerPrivateKey>(data: RSAEncrypted<EncodedString<T>, 
	InstancePublicKey|ServerPublicKey>, 
		privateKey: K): T|ERRS {
			const key = new JSEncrypt();
			key.setPrivateKey(privateKey);

			const decrypted = key.decrypt(data);
			if (decrypted === false || decrypted === null) {
				return ERRS.INVALID_DECRYPT;
			}
			return JSON.parse(decrypted);
		}

export function genRSAKeyPair() {
	const key = new JSEncrypt({
		default_key_size: '1024'
	});
	key.getKey();

	return {
		publicKey: key.getPublicKey(),
		privateKey: key.getPrivateKey()
	}
}

export function pad<T extends string, P extends Paddings>(data: T, padding: P): Padded<T, P> {
	return `${data}${padding}` as Padded<T, P>;
}