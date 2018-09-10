const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { genRandomString } from '../../../server/app/lib/util';
import { PublicKeyEncrypted } from '../../types/db-types';
import * as requireHacker from 'require-hacker';
import { ERRS } from '../../types/crypto';
import path = require('path');
import { assert } from 'chai';

const commonjsJSEncrypt = path.join(__dirname, '../../../server/app/libraries/jsencrypt.js');
requireHacker.resolver((path: string, srcModule: any) => {
	const resolvedPath: string = requireHacker.resolve(path, srcModule);
	if (/shared.libraries.jsencrypt\.js/.exec(resolvedPath)) {
		return commonjsJSEncrypt
	}
	return undefined;
})
import * as browserCrypto from '../../lib/browser-crypto';

export function cryptoBrowserTest() {
	parallel('Browser Crypto', () => {
		it('padding works', () => {
			const base = genRandomString(25);
			assert.strictEqual(browserCrypto.pad(base, 'masterpwverify'), base + 'masterpwverify',
				'padding is the same as expected');
		});
		it('hashing works', () => {
			assert.doesNotThrow(() => {
				browserCrypto.hash('somevalue');
			}, 'encrypt can be called without error');
		});
		it('hashing produces the same values with the same input', () => {
			const input = genRandomString(25);
			assert.strictEqual(browserCrypto.hash(input), browserCrypto.hash(input),
				'hashed values are the same');
		});
		it('hashing different values produces different results', () => {
			const input = genRandomString(25);
			assert.notStrictEqual(browserCrypto.hash(input), browserCrypto.hash(input) + 'x',
				'hashed values are not the same');
		});
		it('encrypting with public key works', () => {
			const input  = genRandomString(25);
			const { publicKey } = browserCrypto.genRSAKeyPair();
			assert.doesNotThrow(() => {
				browserCrypto.encryptWithPublicKey(input, publicKey);
			}, 'public key encrypt can be called without error');
		});
		it('values encrypted with a public key can be decrypted', () => {
			const input  = genRandomString(25);
			const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

			const encrypted = browserCrypto.encryptWithPublicKey(input, publicKey);
			const decrypted = browserCrypto.decryptWithPrivateKey(encrypted, privateKey);
			assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
		});
		it('public/private key encryption returns error on invalid decrypt', () => {
			const { privateKey } = browserCrypto.genRSAKeyPair();

			const decrypted = browserCrypto.decryptWithPrivateKey('baddecrypt' as PublicKeyEncrypted<string, string>, 
				privateKey);
			assert.strictEqual(decrypted, ERRS.INVALID_DECRYPT, 'is invalid decrypt');
		});
		it('hybrid encryption works', () => {
			const input = genRandomString(25);
			const { publicKey } = browserCrypto.genRSAKeyPair();
			assert.doesNotThrow(() => {
				browserCrypto.hybridEncrypt(input, publicKey);
			}, 'hybrid encryption can be done without error');
		});
		it('hybrid encrypted data can be decrypted', () => {
			const input = genRandomString(25);
			const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

			const encrypted = browserCrypto.hybridEncrypt(input, publicKey);
			const decrypted = browserCrypto.hybdridDecrypt(encrypted, privateKey);
			assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
		});
		it('regular AES encryption works', () => {
			const input = genRandomString(25);
			const key = genRandomString(25);
			assert.doesNotThrow(() => {
				browserCrypto.encrypt(input, key, 'aes-256-ctr');
			}, 'encryption does not throw error');
		});
		it('values encrypted with AES can be decrypted', () => {
			const input = genRandomString(25);
			const key = genRandomString(25);
			const encrypted = browserCrypto.encrypt(input, key, 'aes-256-ctr');

			const decrypted = browserCrypto.decrypt(encrypted, key);
			assert.strictEqual(decrypted, input,
				'decrypted matches original value');
		});
		it('values encrypted with AES can be decrypted when the key is longer than 32 chars', () => {
			const input = genRandomString(25);
			const key = genRandomString(40);
			const encrypted = browserCrypto.encrypt(input, key, 'aes-256-ctr');

			const decrypted = browserCrypto.decrypt(encrypted, key);
			assert.strictEqual(decrypted, input,
				'decrypted matches original value');
		});
		it('values encrypted with AES can be decrypted when the key is less than 32 chars', () => {
			const input = genRandomString(25);
			const key = genRandomString(20);
			const encrypted = browserCrypto.encrypt(input, key, 'aes-256-ctr');

			const decrypted = browserCrypto.decrypt(encrypted, key);
			assert.strictEqual(decrypted, input,
				'decrypted matches original value');
		});
		it('values encrypted with AES can be decrypted when the key is exactly 32 chars', () => {
			const input = genRandomString(25);
			const key = genRandomString(32);
			const encrypted = browserCrypto.encrypt(input, key, 'aes-256-ctr');

			const decrypted = browserCrypto.decrypt(encrypted, key);
			assert.strictEqual(decrypted, input,
				'decrypted matches original value');
		});
	});
}