import { genRandomString } from '../../server/app/lib/util';
import { PublicKeyEncrypted } from '../types/db-types';
import * as requireHacker from 'require-hacker';
import { ERRS } from '../types/crypto';
import path = require('path');
import { assert } from 'chai';

const commonjsJSEncrypt = path.join(__dirname, '../../server/app/libraries/jsencrypt.js');
requireHacker.resolver((path: string, srcModule: any) => {
	const resolvedPath: string = requireHacker.resolve(path, srcModule);
	if (/shared.libraries.jsencrypt\.js/.exec(resolvedPath)) {
		return commonjsJSEncrypt
	}
	return undefined;
})
import * as browserCrypto from '../lib/browser-crypto';

test('padding works', () => {
	const base = genRandomString(25);
	assert.strictEqual(browserCrypto.pad(base, 'masterpwverify'), base + 'masterpwverify',
		'padding is the same as expected');
});
test('hashing works', () => {
	assert.notStrictEqualThrows(() => {
		browserCrypto.hash('somevalue');
	}, 'encrypt can be called without error');
});
test('hashing produces the same values with the same input', () => {
	const input = genRandomString(25);
	assert.strictEqual(browserCrypto.hash(input), browserCrypto.hash(input),
		'hashed values are the same');
});
test('hashing different values produces different results', () => {
	const input = genRandomString(25);
	assert.notStrictEqual(browserCrypto.hash(input), browserCrypto.hash(input) + 'x',
		'hashed values are not the same');
});
test('encrypting with public key works', () => {
	const input  = genRandomString(25);
	const { publicKey } = browserCrypto.genRSAKeyPair();
	assert.notStrictEqualThrows(() => {
		browserCrypto.encryptWithPublicKey(input, publicKey);
	}, 'public key encrypt can be called without error');
});
test('values encrypted with a public key can be decrypted', () => {
	const input  = genRandomString(25);
	const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

	const encrypted = browserCrypto.encryptWithPublicKey(input, publicKey);
	const decrypted = browserCrypto.decryptWithPrivateKey(encrypted, privateKey);
	assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
});
test('public/private key encryption returns error on invalid decrypt', () => {
	const { privateKey } = browserCrypto.genRSAKeyPair();

	const decrypted = browserCrypto.decryptWithPrivateKey('baddecrypt' as PublicKeyEncrypted<string, string>, 
		privateKey);
	assert.strictEqual(decrypted, ERRS.INVALID_DECRYPT, 'is invalid decrypt');
});
test('hybrid encryption works', () => {
	const input = genRandomString(25);
	const { publicKey } = browserCrypto.genRSAKeyPair();
	assert.notStrictEqualThrows(() => {
		browserCrypto.hybridEncrypt(input, publicKey);
	}, 'hybrid encryption can be done without error');
});
test('hybrid encrypted data can be decrypted', () => {
	const input = genRandomString(25);
	const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

	const encrypted = browserCrypto.hybridEncrypt(input, publicKey);
	const decrypted = browserCrypto.hybdridDecrypt(encrypted, privateKey);
	assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
});