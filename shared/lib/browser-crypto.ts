import { InstancePublicKey, ServerPublicKey, RSAEncrypted, ServerPrivateKey, HybridEncrypted, PublicKeyEncrypted } from "../types/db-types";
import { HashingAlgorithms, Hashed, ERRS, Padded, Paddings, Encrypted  } from "../types/crypto";
import { JSEncrypt } from '../libraries/jsencrypt'
import { utils, ModeOfOperation } from 'aes-js';
import { sha512, sha512_256 } from 'js-sha512';
import { Bytes } from "aes-js";

function getHashingFunction(algorithm: HashingAlgorithms) {
	switch (algorithm) {
		case 'sha512':
			return sha512;
		case 'sha256':
			return sha512_256;
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

export function asyncEncrypt<T, K extends InstancePublicKey|ServerPublicKey>(data: T, 
	publicKey: K): RSAEncrypted<EncodedString<T>, K> {
		const key = new JSEncrypt();
		key.setPublicKey(publicKey);

		return key.encrypt(JSON.stringify(data)) as 
			RSAEncrypted<EncodedString<T>, K>;
	}

export function asyncDecrypt<T, K extends ServerPrivateKey>(data: RSAEncrypted<EncodedString<T>, 
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
		privateKey: K): T|ERRS {
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

export function hybridEncrypt<T, K extends InstancePublicKey|ServerPublicKey>(data: T,
	publicKey: K): HybridEncrypted<T, K> {
		//Generate an AES key of length 32
		const aesKey = utils.hex.fromBytes(new Array(32).fill(0).map(() => {
			return Math.floor(Math.random() * 256);
		}));

		//Encrypt the AES key with the public key
		const encryptedAESKey = JSON.parse(encryptWithPublicKey(aesKey, publicKey) as EncodedString<{
			type: 'async';
			data: RSAEncrypted<EncodedString<string>, K>;
		}>).data;

		//Encrypt the data with the AES key
		const aes = new ModeOfOperation.ctr(
			utils.hex.toBytes(aesKey));
		const encryptedData = aes.encrypt(utils.utf8.toBytes(
			JSON.stringify(data)
		));

		return JSON.stringify({
			data: utils.hex.fromBytes(encryptedData as Bytes<Encrypted<EncodedString<T>, string>>),
			symmetricKey: encryptedAESKey
		});
	}

export function hybdridDecrypt<T, K extends ServerPrivateKey>(data: HybridEncrypted<T, K>,
	privateKey: K): T|ERRS {
		try {
			const { symmetricKey, data: encrypted } = JSON.parse(data);

			//Decrypt the key
			const decryptedKey = decryptWithPrivateKey(JSON.stringify({
				data: symmetricKey,
				type: 'async' as 'async'
			}), privateKey);

			//Decrypt the data 
			const aes = new ModeOfOperation.ctr(
				utils.hex.toBytes(decryptedKey));
			const decryptedData = utils.utf8.fromBytes(
				aes.decrypt(utils.hex.toBytes(encrypted)) as Bytes<EncodedString<T>>);
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