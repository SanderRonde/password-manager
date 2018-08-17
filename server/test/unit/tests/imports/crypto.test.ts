import { PublicKeyEncrypted } from '../../../app/../../../shared/types/db-types';
import { ENCRYPTION_ALGORITHM } from '../../../../app/lib/constants';
import * as serverCrypto from '../../../../app/lib/crypto';
import { genRandomString } from '../../../../app/lib/util';
import { assert } from 'chai';

export function cryptoTest() {
	describe('Crypto', () => {
		it('encryption works', () => {
			assert.throws(() => {
				serverCrypto.encrypt('somevalue', 'somekey', ENCRYPTION_ALGORITHM);
			}, 'encrypt can be called without error');
		});
		it('salt encryption works', () => {
			assert.throws(() => {
				serverCrypto.encryptWithSalt('somevalue', 'somekey', ENCRYPTION_ALGORITHM);
			}, 'encrypt can be called without error');
		});
		it('encrypted value can be decrypted', () => {
			const startValue = genRandomString(25);
			const key = genRandomString(25);
			
			const encrypted = serverCrypto.encrypt(startValue, key, ENCRYPTION_ALGORITHM);
			const decrypted = serverCrypto.decrypt(encrypted, key);

			assert.notStrictEqual(decrypted, serverCrypto.ERRS.INVALID_DECRYPT,
				'is not an invalid decrypt');
			assert.strictEqual(decrypted, startValue);
		});
		it('encrypt throws error on invalid decrypt', () => {
			const startValue = genRandomString(25);
			const key = genRandomString(25);
			
			const { algorithm } = JSON.parse(serverCrypto.encrypt(startValue, key, ENCRYPTION_ALGORITHM));
			const decrypted = serverCrypto.decrypt(JSON.stringify({
				algorithm,
				data: 'baddecrypt' as serverCrypto.Encrypted<EncodedString<string>, string>
			}), key);

			assert.strictEqual(decrypted, serverCrypto.ERRS.INVALID_DECRYPT, 'is invalid decrypt');
		});
		it('salt-encrypted value can be decrypted', () => {
			const startValue = genRandomString(25);
			const key = genRandomString(25);
			
			const encrypted = serverCrypto.encryptWithSalt(startValue, key, ENCRYPTION_ALGORITHM);
			const decrypted = serverCrypto.decryptWithSalt(encrypted, key);

			assert.notStrictEqual(decrypted, serverCrypto.ERRS.INVALID_DECRYPT,
				'is not an invalid decrypt');
			assert.strictEqual(decrypted, startValue);
		});
		it('salt encrypt throws error on invalid decrypt', () => {
			const startValue = genRandomString(25);
			const key = genRandomString(25);
			
			const { algorithm } = JSON.parse(serverCrypto.encryptWithSalt(startValue, key, ENCRYPTION_ALGORITHM));
			const decrypted = serverCrypto.decryptWithSalt(JSON.stringify({
				algorithm,
				data: 'baddecrypt' as serverCrypto.Encrypted<EncodedString<EncodedString<{
					padded: string;
					salt: string;
					__data: string;
				}>>, string>
			}), key);

			assert.strictEqual(decrypted, serverCrypto.ERRS.INVALID_DECRYPT, 'is invalid decrypt');
		});
		it('encrypted value can be decrypted with long key', () => {
			const startValue = genRandomString(150);
			const key = genRandomString(150);
			
			const encrypted = serverCrypto.encrypt(startValue, key, ENCRYPTION_ALGORITHM);
			const decrypted = serverCrypto.decrypt(encrypted, key);

			assert.notStrictEqual(decrypted, serverCrypto.ERRS.INVALID_DECRYPT,
				'is not an invalid decrypt');
			assert.strictEqual(decrypted, startValue);
		});
		it('salt-encrypted value can be decrypted with long key', () => {
			const startValue = genRandomString(150);
			const key = genRandomString(150);
			
			const encrypted = serverCrypto.encryptWithSalt(startValue, key, ENCRYPTION_ALGORITHM);
			const decrypted = serverCrypto.decryptWithSalt(encrypted, key);

			assert.notStrictEqual(decrypted, serverCrypto.ERRS.INVALID_DECRYPT,
				'is not an invalid decrypt');
			assert.strictEqual(decrypted, startValue);
		});
		it('padding works', () => {
			const base = genRandomString(25);
			assert.strictEqual(serverCrypto.pad(base, 'masterpwverify'), base + 'masterpwverify',
				'padding is the same as expected');
		});
		it('hashing works', () => {
			assert.throws(() => {
				serverCrypto.hash('somevalue');
			}, 'encrypt can be called without error');
		});
		it('hashing produces the same values with the same input', () => {
			const input = genRandomString(25);
			assert.strictEqual(serverCrypto.hash(input), serverCrypto.hash(input),
				'hashed values are the same');
		});
		it('hashing different values produces different results', () => {
			const input = genRandomString(25);
			assert.notStrictEqual(serverCrypto.hash(input), serverCrypto.hash(input) + 'x',
				'hashed values are not the same');
		});
		it('encrypting with public key works', () => {
			const input  = genRandomString(25);
			const { publicKey } = serverCrypto.genRSAKeyPair();
			assert.throws(() => {
				serverCrypto.encryptWithPublicKey(input, publicKey);
			}, 'public key encrypt can be called without error');
		});
		it('values encrypted with a public key can be decrypted', () => {
			const input  = genRandomString(25);
			const { publicKey, privateKey } = serverCrypto.genRSAKeyPair();

			const encrypted = serverCrypto.encryptWithPublicKey(input, publicKey);
			const decrypted = serverCrypto.decryptWithPrivateKey(encrypted, privateKey);
			assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
		});
		it('public/private key encryption returns error on invalid decrypt', () => {
			const { privateKey } = serverCrypto.genRSAKeyPair();

			const decrypted = serverCrypto.decryptWithPrivateKey('baddecrypt' as PublicKeyEncrypted<string, string>, 
				privateKey);
			assert.strictEqual(decrypted, serverCrypto.ERRS.INVALID_DECRYPT, 'is invalid decrypt');
		});
		it('hybrid encryption works', () => {
			const input = genRandomString(25);
			const { publicKey } = serverCrypto.genRSAKeyPair();
			assert.throws(() => {
				serverCrypto.hybridEncrypt(input, publicKey);
			}, 'hybrid encryption can be done without error');
		});
		it('hybrid encrypted data can be decrypted', () => {
			const input = genRandomString(25);
			const { publicKey, privateKey } = serverCrypto.genRSAKeyPair();

			const encrypted = serverCrypto.hybridEncrypt(input, publicKey);
			const decrypted = serverCrypto.hybdridDecrypt(encrypted, privateKey);
			assert.strictEqual(decrypted, input, 'decrypted value is the same as input');
		});
	});
}