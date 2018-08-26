export { Encrypted, ERRS, SaltEncrypted, EncryptionAlgorithm, Hashed, HashingAlgorithms, MasterPasswordDecryptionpadding, MasterPasswordVerificationPadding, Padded } from '../../../shared/types/crypto'
import { InstancePublicKey, ServerPublicKey, RSAEncrypted, ServerPrivateKey, HybridEncrypted, PublicKeyEncrypted } from "../../../shared/types/db-types";
import { Encrypted, ERRS, SaltEncrypted, EncryptionAlgorithm, Hashed, HashingAlgorithms } from '../../../shared/types/crypto'
import { Padded, Paddings } from "../../../shared/types/crypto";
import { JSEncrypt } from '../libraries/jsencrypt'
import { genRandomString } from './util';
import * as crypto from 'crypto'
import * as aesjs from 'aes-js';
import { Bytes } from "aes-js";

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
}>, key: K): T|ERRS.INVALID_DECRYPT {
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
}>, key: K): T|ERRS.INVALID_DECRYPT {
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

export function asyncEncrypt<T, K extends InstancePublicKey|ServerPublicKey>(data: T, 
	publicKey: K): RSAEncrypted<EncodedString<T>, K> {
		const key = new JSEncrypt();
		key.setPublicKey(publicKey);

		return key.encrypt(JSON.stringify(data)) as 
			RSAEncrypted<EncodedString<T>, K>;
	}

export function asyncDecrypt<T, K extends ServerPrivateKey>(data: RSAEncrypted<EncodedString<T>, 
	InstancePublicKey|ServerPublicKey>, 
		privateKey: K): T|ERRS.INVALID_DECRYPT {
			const key = new JSEncrypt();
			key.setPrivateKey(privateKey);

			const decrypted = key.decrypt(data);
			if (decrypted === false || decrypted === null) {
				return ERRS.INVALID_DECRYPT;
			}
			return JSON.parse(decrypted);
		}

export function encryptWithPublicKey<T, K extends InstancePublicKey|ServerPublicKey>(data: T, 
	publicKey: K): PublicKeyEncrypted<T, K> {
		const stringified = JSON.stringify(data);
		if (stringified.length > 115) {
			return JSON.stringify({
				type: 'hybrid' as 'hybrid',
				data: hybridEncrypt(data, publicKey)
			})
		} else {
			return JSON.stringify({
				type: 'async' as 'async',
				data: asyncEncrypt(data, publicKey)
			});
		}
	}

export function decryptWithPrivateKey<T, K extends ServerPrivateKey>(data: PublicKeyEncrypted<T, 
	InstancePublicKey|ServerPublicKey>, 
		privateKey: K): T|ERRS.INVALID_DECRYPT {
			try {
				const parsed = JSON.parse(data);
				if (parsed.type === 'async') {
					return asyncDecrypt(parsed.data, privateKey);
				} else {
					return hybdridDecrypt(parsed.data, privateKey);
				}
			} catch(e) {
				return ERRS.INVALID_DECRYPT;
			}
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

export function hybridEncrypt<T, K extends InstancePublicKey|ServerPublicKey>(data: T,
	publicKey: K): HybridEncrypted<T, K> {
		//Generate an AES key of length 32
		const aesKey = aesjs.utils.hex.fromBytes(new Array(32).fill(0).map(() => {
			return Math.floor(Math.random() * 256);
		}));

		//Encrypt the AES key with the public key
		const encryptedAESKey = JSON.parse(encryptWithPublicKey(aesKey, publicKey) as EncodedString<{
			type: 'async';
			data: RSAEncrypted<EncodedString<string>, K>;
		}>).data;

		//Encrypt the data with the AES key
		const aes = new aesjs.ModeOfOperation.ctr(
			aesjs.utils.hex.toBytes(aesKey));
		const encryptedData = aes.encrypt(aesjs.utils.utf8.toBytes(
			JSON.stringify(data)
		));

		return JSON.stringify({
			data: aesjs.utils.hex.fromBytes(encryptedData as Bytes<Encrypted<EncodedString<T>, string>>),
			symmetricKey: encryptedAESKey
		});
	}

export function hybdridDecrypt<T, K extends ServerPrivateKey>(data: HybridEncrypted<T, K>,
	privateKey: K): T|ERRS.INVALID_DECRYPT {
		try {
			const { symmetricKey, data: encrypted } = JSON.parse(data);

			//Decrypt the key
			const decryptedKey = decryptWithPrivateKey(JSON.stringify({
				data: symmetricKey,
				type: 'async' as 'async'
			}), privateKey);

			//Decrypt the data 
			const aes = new aesjs.ModeOfOperation.ctr(
				aesjs.utils.hex.toBytes(decryptedKey));
			const decryptedData = aesjs.utils.utf8.fromBytes(
				aes.decrypt(aesjs.utils.hex.toBytes(encrypted)) as Bytes<EncodedString<T>>);
			const parsed = JSON.parse(decryptedData);
			return parsed;
		} catch(e) {
			return ERRS.INVALID_DECRYPT;
		}
	}