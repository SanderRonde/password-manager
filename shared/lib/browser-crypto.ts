import { InstancePublicKey, ServerPublicKey, RSAEncrypted, ServerPrivateKey, HybridEncrypted, PublicKeyEncrypted } from "../types/db-types";
import { HashingAlgorithms, Hashed, ERRS, Padded, Paddings, Encrypted, EncryptionAlgorithm  } from "../types/crypto";
import { utils, ModeOfOperation, padding, Bytes } from 'aes-js';
import { JSEncrypt } from '../libraries/jsencrypt'
import { sha512, sha512_256 } from 'js-sha512';

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

function get32LengthKey(key: string) {
	if (key.length > 32) {
		return utils.utf8.toBytes(key.slice(0, 32));
	} else if (key.length < 32) {
		return padding.pkcs7.pad(
			utils.utf8.toBytes(key));
	} else {
		return utils.utf8.toBytes(key);
	}
}

export function encrypt<T, K extends string, A extends EncryptionAlgorithm>(data: T, key: K, algorithm: A): EncodedString<{
	data: Encrypted<EncodedString<T>, K, A>;
	algorithm: A;
}> {
	//Generate an AES key of length 32
	const aesKey = get32LengthKey(key) as any;

	//Encrypt the data with the AES key
	const aes = new ModeOfOperation.ctr(aesKey);
	const encryptedData = aes.encrypt(utils.utf8.toBytes(
		JSON.stringify(data)
	));

	return JSON.stringify({
		data: utils.hex.fromBytes(encryptedData as any) as
			Encrypted<EncodedString<T>, K>,
		algorithm
	}) as EncodedString<{
		data: Encrypted<EncodedString<T>, K, A>;
		algorithm: A;
	}>;
}

export function decrypt<T, K extends string, A extends EncryptionAlgorithm>(encrypted: EncodedString<{
	data: Encrypted<EncodedString<T>, K, A>;
	algorithm: A;
}>, key: K): T|ERRS.INVALID_DECRYPT {
	try {
		const parsedMeta = JSON.parse(encrypted);
		if (parsedMeta.algorithm !== 'aes-256-ctr') {
			return ERRS.INVALID_DECRYPT;
		}

		//Generate an AES key of length 32
		const aesKey = get32LengthKey(key) as any;

		const aes = new ModeOfOperation.ctr(aesKey);
		const decryptedData = utils.utf8.fromBytes(
			aes.decrypt(utils.hex.toBytes(parsedMeta.data)) as Bytes<EncodedString<T>>);
		return JSON.parse(decryptedData);
	} catch(e) {
		return ERRS.INVALID_DECRYPT;
	}
}

export async function createDigest({ 
	secret, 
	counter,
	crypto = window.crypto
}: {
	secret: string;
	counter: number;
	crypto?:  Crypto
}) {
	// create an buffer from the counter
	const buf = new Buffer(8);
	let tmp = counter;
	for (let i = 0; i < 8; i++) {
	  // mask 0xff over number to get last 8
	  buf[7 - i] = tmp & 0xff;
  
	  // shift 8 and get ready to loop over the next batch of 8
	  tmp = tmp >> 8;
	}

	const key = await crypto.subtle.importKey('raw', 
		new TextEncoder().encode(secret), {
			name: 'HMAC',
			hash: {
				name: 'SHA-1'
			}
		}, false, ['sign']);
  
	return new Uint8Array(await crypto.subtle.sign('HMAC', key, buf));
}

export async function totp({ 
	secret, 
	step = 30,
	crypto = window.crypto
}: {
	secret: string;
	step?: number;
	crypto?: Crypto;
}) {
	const counter = Math.floor((Date.now() / step) / 1000);
	const digits = 6;

	// digest the options
	const digest = await createDigest({ 
		secret, 
		counter,
		crypto
	});

	const offset = digest[digest.length - 1] & 0xf;

	const code = (digest[offset] & 0x7f) << 24 |
		(digest[offset + 1] & 0xff) << 16 |
		(digest[offset + 2] & 0xff) << 8 |
		(digest[offset + 3] & 0xff);

	return new Array(digits + 1).join('0') + code.toString(10).substr(-digits);
}