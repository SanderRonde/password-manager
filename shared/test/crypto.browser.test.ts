import { genRandomString } from '../../server/app/lib/util';
import { PublicKeyEncrypted } from '../types/db-types';
import * as requireHacker from 'require-hacker';
import { ERRS } from '../types/crypto';
import path = require('path');
import { test } from 'ava';

const commonjsJSEncrypt = path.join(__dirname, '../../server/app/libraries/jsencrypt.js');
requireHacker.resolver((path: string, srcModule: any) => {
	const resolvedPath: string = requireHacker.resolve(path, srcModule);
	if (resolvedPath.indexOf('shared\\libraries\\jsencrypt.js') > -1) {
		return commonjsJSEncrypt
	}
	return undefined;
})
import * as browserCrypto from '../lib/browser-crypto';

test('padding works', t => {
	const base = genRandomString(25);
	t.is(browserCrypto.pad(base, 'masterpwverify'), base + 'masterpwverify',
		'padding is the same as expected');
});
test('hashing works', t => {
	t.notThrows(() => {
		browserCrypto.hash('somevalue');
	}, 'encrypt can be called without error');
});
test('hashing produces the same values with the same input', t => {
	const input = genRandomString(25);
	t.is(browserCrypto.hash(input), browserCrypto.hash(input),
		'hashed values are the same');
});
test('hashing different values produces different results', t => {
	const input = genRandomString(25);
	t.not(browserCrypto.hash(input), browserCrypto.hash(input) + 'x',
		'hashed values are not the same');
});
test('encrypting with public key works', t => {
	const input  = genRandomString(25);
	const { publicKey } = browserCrypto.genRSAKeyPair();
	t.notThrows(() => {
		browserCrypto.encryptWithPublicKey(input, publicKey);
	}, 'public key encrypt can be called without error');
});
test('values encrypted with a public key can be decrypted', t => {
	const input  = genRandomString(25);
	const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

	const encrypted = browserCrypto.encryptWithPublicKey(input, publicKey);
	const decrypted = browserCrypto.decryptWithPrivateKey(encrypted, privateKey);
	t.is(decrypted, input, 'decrypted value is the same as input');
});
test('public/private key encryption returns error on invalid decrypt', t => {
	const { privateKey } = browserCrypto.genRSAKeyPair();

	const decrypted = browserCrypto.decryptWithPrivateKey('baddecrypt' as PublicKeyEncrypted<string, string>, 
		privateKey);
	t.is(decrypted, ERRS.INVALID_DECRYPT, 'is invalid decrypt');
});
test('hybrid encryption works', t => {
	const input = genRandomString(25);
	const { publicKey } = browserCrypto.genRSAKeyPair();
	t.notThrows(() => {
		browserCrypto.hybridEncrypt(input, publicKey);
	}, 'hybrid encryption can be done without error');
});
test('hybrid encrypted data can be decrypted', t => {
	const input = genRandomString(25);
	const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

	const encrypted = browserCrypto.hybridEncrypt(input, publicKey);
	const decrypted = browserCrypto.hybdridDecrypt(encrypted, privateKey);
	t.is(decrypted, input, 'decrypted value is the same as input');
});