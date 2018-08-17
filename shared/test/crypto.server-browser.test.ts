const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
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

export function cryptoServerBrowserTest() {
	parallel('Server-Browser Crypto', () => {
		it('paddings are the same', () => {
			const base = genRandomString(25);
			assert.strictEqual(browserCrypto.pad(base, 'masterpwverify'), 
				serverCrypto.pad(base, 'masterpwverify'),
					'padding is the same as expected');
		});
		it('hashing functions are the same', () => {
			const base = 'somevalue';
			assert.strictEqual(browserCrypto.hash(base),
				serverCrypto.hash(base),
					'hashed values are the same');
		});
		it('public key encryption encrypted by the server can be decrypted by the browser', () => {
			const input  = genRandomString(25);
			const { publicKey, privateKey } = serverCrypto.genRSAKeyPair();
			const encrypted = serverCrypto.encryptWithPublicKey(input, publicKey);
			const decrypted = browserCrypto.decryptWithPrivateKey(encrypted, privateKey);
			assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
		});
		it('public key encryption encrypted by the browser can be decrypted by the server', () => {
			const input  = genRandomString(25);
			const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();
			const encrypted = browserCrypto.encryptWithPublicKey(input, publicKey);
			const decrypted = serverCrypto.decryptWithPrivateKey(encrypted, privateKey);
			assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
		});
		it('data hybrid encrypted by the server can be decrypted by the browser', () => {
			const input = genRandomString(25);
			const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

			const encrypted = serverCrypto.hybridEncrypt(input, publicKey);

			const decrypted = browserCrypto.hybdridDecrypt(encrypted, privateKey);
			assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
		});
		it('data hybrid encrypted by the browser can be decrypted by the server', () => {
			const input = genRandomString(25);
			const { publicKey, privateKey } = browserCrypto.genRSAKeyPair();

			const encrypted = browserCrypto.hybridEncrypt(input, publicKey);
			
			const decrypted = serverCrypto.hybdridDecrypt(encrypted, privateKey);
			assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
		});
	});
}