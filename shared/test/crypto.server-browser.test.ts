import { genRandomString } from '../../server/app/lib/util';
import * as serverCrypto from '../../server/app/lib/crypto';
import * as requireHacker from 'require-hacker';
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

test('paddings are the same', t => {
	const base = genRandomString(25);
	t.is(browserCrypto.pad(base, 'masterpwverify'), 
		serverCrypto.pad(base, 'masterpwverify'),
			'padding is the same as expected');
});
test('hashing functions are the same', t => {
	const base = 'somevalue';
	t.is(browserCrypto.hash(base),
		serverCrypto.hash(base),
			'hashed values are the same');
});
test('public key encryption encrypted by the server can be decrypted by the browser', t => {
	const input  = genRandomString(25);
	const { publicKey, privateKey } = serverCrypto.genRSAKeyPair();
	const encrypted = serverCrypto.encryptWithPublicKey(input, publicKey);
	const decrypted = browserCrypto.decryptWithPrivateKey(encrypted, privateKey);
	t.is(decrypted, input, 'decrypted value is the same as input');
});
test('public key encryption encrypted by the browser can be decrypted by the server', t => {
	const input  = genRandomString(25);
	const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();
	const encrypted = browserCrypto.encryptWithPublicKey(input, publicKey);
	const decrypted = serverCrypto.decryptWithPrivateKey(encrypted, privateKey);
	t.is(decrypted, input, 'decrypted value is the same as input');
});
test('data hybrid encrypted by the server can be decrypted by the browser', t => {
	const input = genRandomString(25);
	const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

	const encrypted = serverCrypto.hybridEncrypt(input, publicKey);

	const decrypted = browserCrypto.hybdridDecrypt(encrypted, privateKey);
	t.is(decrypted, input, 'decrypted value is the same as input');
});
test('data hybrid encrypted by the browser can be decrypted by the server', t => {
	const input = genRandomString(25);
	const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

	const encrypted = browserCrypto.hybridEncrypt(input, publicKey);
	
	const decrypted = serverCrypto.hybdridDecrypt(encrypted, privateKey);
	t.is(decrypted, input, 'decrypted value is the same as input');
});