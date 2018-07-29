import { InstancePublicKey, ServerPublicKey, RSAEncrypted, ServerPrivateKey } from "../../server/app/database/db-types";
import { ERRS, Padded, Paddings } from "../../server/app/lib/crypto";
import NodeRSA = require('node-rsa');

export function encryptWithPublicKey<T, K extends InstancePublicKey|ServerPublicKey>(data: T, 
	publicKey: K): RSAEncrypted<EncodedString<T>, K> {
		const key = new NodeRSA();
		key.importKey(publicKey, 'pkcs8-public-pem');

		return key.encrypt(JSON.stringify(data), 'base64') as 
			RSAEncrypted<EncodedString<T>, K>;
	}

export function decryptWithPrivateKey<T, K extends ServerPrivateKey>(data: RSAEncrypted<EncodedString<T>, 
	InstancePublicKey|ServerPublicKey>, 
		privateKey: K): T|ERRS {
			const key = new NodeRSA();
			key.importKey(privateKey, 'pkcs1-pem');

			try {
				return JSON.parse(key.decrypt(data, 'utf8'));
			} catch(e) {
				return ERRS.INVALID_DECRYPT;
			}
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

export function pad<T extends string, P extends Paddings>(data: T, padding: P): Padded<T, P> {
	return `${data}${padding}` as Padded<T, P>;
}