import { InstancePublicKey, ServerPublicKey, RSAEncrypted, ServerPrivateKey } from "../types/db-types";
import { HashingAlgorithms, Hashed, ERRS, Padded, Paddings  } from "../types/crypto";
import { JSEncrypt } from '../libraries/jsencrypt'
import * as jsSha512 from 'js-sha512';

function getHashingFunction(algorithm: HashingAlgorithms) {
	switch (algorithm) {
		case 'sha512':
			return jsSha512.sha512;
		case 'sha256':
			return jsSha512.sha512_256;
	}
	return null;
}

export function hash<T extends string, A extends HashingAlgorithms = 'sha512'>(data: T, 
	algorithm: A = 'sha512' as A): Hashed<T, A> {
		const fn = getHashingFunction(algorithm);
		if (fn === null) {
			throw new Error('Hashing algorithm not supported');
		}
		const hash = fn.create();
		hash.update(data);
		return hash.hex() as Hashed<T, A>;
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
			if (decrypted === false) {
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