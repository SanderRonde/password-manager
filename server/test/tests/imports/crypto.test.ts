import { PublicKeyEncrypted } from '../../../app/../../shared/types/db-types';
import { ENCRYPTION_ALGORITHM } from '../../../app/lib/constants';
import * as serverCrypto from '../../../app/lib/crypto';
import { genRandomString } from '../../../app/lib/util';
import { assert } from 'chai';

test('encryption works', t => {
	t.notThrows(() => {
		serverCrypto.encrypt('somevalue', 'somekey', ENCRYPTION_ALGORITHM);
	}, 'encrypt can be called without error');
});
test('salt encryption works', t => {
	t.notThrows(() => {
		serverCrypto.encryptWithSalt('somevalue', 'somekey', ENCRYPTION_ALGORITHM);
	}, 'encrypt can be called without error');
});
test('encrypted value can be decrypted', t => {
	const startValue = genRandomString(25);
	const key = genRandomString(25);
	
	const encrypted = serverCrypto.encrypt(startValue, key, ENCRYPTION_ALGORITHM);
	const decrypted = serverCrypto.decrypt(encrypted, key);

	t.not(decrypted, serverCrypto.ERRS.INVALID_DECRYPT,
		'is not an invalid decrypt');
	t.is(decrypted, startValue);
});
test('encrypt throws error on invalid decrypt', t => {
	const startValue = genRandomString(25);
	const key = genRandomString(25);
	
	const { algorithm } = JSON.parse(serverCrypto.encrypt(startValue, key, ENCRYPTION_ALGORITHM));
	const decrypted = serverCrypto.decrypt(JSON.stringify({
		algorithm,
		data: 'baddecrypt' as serverCrypto.Encrypted<EncodedString<string>, string>
	}), key);

	t.is(decrypted, serverCrypto.ERRS.INVALID_DECRYPT, 'is invalid decrypt');
});
test('salt-encrypted value can be decrypted', t => {
	const startValue = genRandomString(25);
	const key = genRandomString(25);
	
	const encrypted = serverCrypto.encryptWithSalt(startValue, key, ENCRYPTION_ALGORITHM);
	const decrypted = serverCrypto.decryptWithSalt(encrypted, key);

	t.not(decrypted, serverCrypto.ERRS.INVALID_DECRYPT,
		'is not an invalid decrypt');
	t.is(decrypted, startValue);
});
test('salt encrypt throws error on invalid decrypt', t => {
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

	t.is(decrypted, serverCrypto.ERRS.INVALID_DECRYPT, 'is invalid decrypt');
});
test('encrypted value can be decrypted with long key', t => {
	const startValue = genRandomString(150);
	const key = genRandomString(150);
	
	const encrypted = serverCrypto.encrypt(startValue, key, ENCRYPTION_ALGORITHM);
	const decrypted = serverCrypto.decrypt(encrypted, key);

	t.not(decrypted, serverCrypto.ERRS.INVALID_DECRYPT,
		'is not an invalid decrypt');
	t.is(decrypted, startValue);
});
test('salt-encrypted value can be decrypted with long key', t => {
	const startValue = genRandomString(150);
	const key = genRandomString(150);
	
	const encrypted = serverCrypto.encryptWithSalt(startValue, key, ENCRYPTION_ALGORITHM);
	const decrypted = serverCrypto.decryptWithSalt(encrypted, key);

	t.not(decrypted, serverCrypto.ERRS.INVALID_DECRYPT,
		'is not an invalid decrypt');
	t.is(decrypted, startValue);
});
test('padding works', t => {
	const base = genRandomString(25);
	t.is(serverCrypto.pad(base, 'masterpwverify'), base + 'masterpwverify',
		'padding is the same as expected');
});
test('hashing works', t => {
	t.notThrows(() => {
		serverCrypto.hash('somevalue');
	}, 'encrypt can be called without error');
});
test('hashing produces the same values with the same input', t => {
	const input = genRandomString(25);
	t.is(serverCrypto.hash(input), serverCrypto.hash(input),
		'hashed values are the same');
});
test('hashing different values produces different results', t => {
	const input = genRandomString(25);
	t.not(serverCrypto.hash(input), serverCrypto.hash(input) + 'x',
		'hashed values are not the same');
});
test('encrypting with public key works', t => {
	const input  = genRandomString(25);
	const { publicKey } = serverCrypto.genRSAKeyPair();
	t.notThrows(() => {
		serverCrypto.encryptWithPublicKey(input, publicKey);
	}, 'public key encrypt can be called without error');
});
test('values encrypted with a public key can be decrypted', t => {
	const input  = genRandomString(25);
	const { publicKey, privateKey } = serverCrypto.genRSAKeyPair();

	const encrypted = serverCrypto.encryptWithPublicKey(input, publicKey);
	const decrypted = serverCrypto.decryptWithPrivateKey(encrypted, privateKey);
	t.is(decrypted, input, 'decrypted value is the same as input');
});
test('public/private key encryption returns error on invalid decrypt', t => {
	const { privateKey } = serverCrypto.genRSAKeyPair();

	const decrypted = serverCrypto.decryptWithPrivateKey('baddecrypt' as PublicKeyEncrypted<string, string>, 
		privateKey);
	t.is(decrypted, serverCrypto.ERRS.INVALID_DECRYPT, 'is invalid decrypt');
});
test('hybrid encryption works', t => {
	const input = genRandomString(25);
	const { publicKey } = serverCrypto.genRSAKeyPair();
	t.notThrows(() => {
		serverCrypto.hybridEncrypt(input, publicKey);
	}, 'hybrid encryption can be done without error');
});
test('hybrid encrypted data can be decrypted', t => {
	const input = genRandomString(25);
	const { publicKey, privateKey } = serverCrypto.genRSAKeyPair();

	const encrypted = serverCrypto.hybridEncrypt(input, publicKey);
	const decrypted = serverCrypto.hybdridDecrypt(encrypted, privateKey);
	t.is(decrypted, input, 'decrypted value is the same as input');
});