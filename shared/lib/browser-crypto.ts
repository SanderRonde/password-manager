import { InstancePublicKey, ServerPublicKey, RSAEncrypted, ServerPrivateKey, HybridEncrypted } from "../types/db-types";
import { HashingAlgorithms, Hashed, ERRS, Padded, Paddings, Encrypted  } from "../types/crypto";
import { JSEncrypt } from '../libraries/jsencrypt'
import * as jsSha512 from 'js-sha512';
import * as aesjs from 'aes-js';
import { Bytes } from "aes-js";

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
			if (decrypted === false || decrypted === null) {
				return ERRS.INVALID_DECRYPT;
			}
			try {
				return JSON.parse(decrypted);
			} catch(e) {
				return ERRS.INVALID_DECRYPT;
			}
		}

export function hybridEncrypt<T, K extends InstancePublicKey|ServerPublicKey>(data: T,
	publicKey: K): HybridEncrypted<T, K> {
		//Generate an AES key of length 32
		const aesKey = aesjs.utils.hex.fromBytes(new Array(32).fill(0).map(() => {
			return Math.floor(Math.random() * 256);
		}));

		//Encrypt the AES key with the public key
		const encryptedAESKey = encryptWithPublicKey(aesKey, publicKey);

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
	privateKey: K): T|ERRS {
		try {
			const { symmetricKey, data: encrypted } = JSON.parse(data);

			//Decrypt the key
			const decryptedKey = decryptWithPrivateKey(symmetricKey, privateKey);

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