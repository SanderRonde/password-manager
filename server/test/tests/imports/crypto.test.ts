import { encrypt, encryptWithSalt, decrypt, ERRS, decryptWithSalt, pad, hash, encryptWithPublicKey, genRSAKeyPair, decryptWithPrivateKey, Encrypted } from '../../../app/lib/crypto';
import { ENCRYPTION_ALGORITHM } from '../../../app/lib/constants';
import { RSAEncrypted } from '../../../app/database/db-types';
import { genRandomString } from '../../../app/lib/util';
import { test } from 'ava';

test('encryption works', t => {
	t.notThrows(() => {
		encrypt('somevalue', 'somekey', ENCRYPTION_ALGORITHM);
	}, 'encrypt can be called without error');
});
test('salt encryption works', t => {
	t.notThrows(() => {
		encryptWithSalt('somevalue', 'somekey', ENCRYPTION_ALGORITHM);
	}, 'encrypt can be called without error');
});
test('encrypted value can be decrypted', t => {
	const startValue = genRandomString(25);
	const key = genRandomString(25);
	
	const encrypted = encrypt(startValue, key, ENCRYPTION_ALGORITHM);
	const decrypted = decrypt(encrypted, key);

	t.not(decrypted, ERRS.INVALID_DECRYPT,
		'is not an invalid decrypt');
	t.is(decrypted, startValue);
});
test('encrypt throws error on invalid decrypt', t => {
	const startValue = genRandomString(25);
	const key = genRandomString(25);
	
	const { algorithm } = JSON.parse(encrypt(startValue, key, ENCRYPTION_ALGORITHM));
	const decrypted = decrypt(JSON.stringify({
		algorithm,
		data: 'baddecrypt' as Encrypted<EncodedString<string>, string>
	}), key);

	t.is(decrypted, ERRS.INVALID_DECRYPT, 'is invalid decrypt');
});
test('salt-encrypted value can be decrypted', t => {
	const startValue = genRandomString(25);
	const key = genRandomString(25);
	
	const encrypted = encryptWithSalt(startValue, key, ENCRYPTION_ALGORITHM);
	const decrypted = decryptWithSalt(encrypted, key);

	t.not(decrypted, ERRS.INVALID_DECRYPT,
		'is not an invalid decrypt');
	t.is(decrypted, startValue);
});
test('salt encrypt throws error on invalid decrypt', t => {
	const startValue = genRandomString(25);
	const key = genRandomString(25);
	
	const { algorithm } = JSON.parse(encryptWithSalt(startValue, key, ENCRYPTION_ALGORITHM));
	const decrypted = decryptWithSalt(JSON.stringify({
		algorithm,
		data: 'baddecrypt' as Encrypted<EncodedString<EncodedString<{
			padded: string;
			salt: string;
			__data: string;
		}>>, string>
	}), key);

	t.is(decrypted, ERRS.INVALID_DECRYPT, 'is invalid decrypt');
});
test('encrypted value can be decrypted with long key', t => {
	const startValue = genRandomString(150);
	const key = genRandomString(150);
	
	const encrypted = encrypt(startValue, key, ENCRYPTION_ALGORITHM);
	const decrypted = decrypt(encrypted, key);

	t.not(decrypted, ERRS.INVALID_DECRYPT,
		'is not an invalid decrypt');
	t.is(decrypted, startValue);
});
test('salt-encrypted value can be decrypted with long key', t => {
	const startValue = genRandomString(150);
	const key = genRandomString(150);
	
	const encrypted = encryptWithSalt(startValue, key, ENCRYPTION_ALGORITHM);
	const decrypted = decryptWithSalt(encrypted, key);

	t.not(decrypted, ERRS.INVALID_DECRYPT,
		'is not an invalid decrypt');
	t.is(decrypted, startValue);
});
test('padding works', t => {
	const base = genRandomString(25);
	t.is(pad(base, 'masterpwverify'), base + 'masterpwverify',
		'padding is the same as expected');
});
test('hashing works', t => {
	t.notThrows(() => {
		hash('somevalue');
	}, 'encrypt can be called without error');
});
test('hashing produces the same values with the same input', t => {
	const input = genRandomString(25);
	t.is(hash(input), hash(input),
		'hashed values are the same');
});
test('hashing different values produces different results', t => {
	const input = genRandomString(25);
	t.not(hash(input), hash(input) + 'x',
		'hashed values are not the same');
});
test('encrypting with public key works', t => {
	const input  = genRandomString(25);
	const { publicKey } = genRSAKeyPair();
	t.notThrows(() => {
		encryptWithPublicKey(input, publicKey);
	}, 'public key encrypt can be called without error');
});
test('values encrypted with a public key can be decrypted', t => {
	const input  = genRandomString(25);
	const { publicKey, privateKey } = genRSAKeyPair();

	const encrypted = encryptWithPublicKey(input, publicKey);
	const decrypted = decryptWithPrivateKey(encrypted, privateKey);
	t.is(decrypted, input, 'decrypted value is the same as input');
});
test('public/private key encryption returns error on invalid decrypt', t => {
	const { privateKey } = genRSAKeyPair();

	const decrypted = decryptWithPrivateKey('baddecrypt' as RSAEncrypted<EncodedString<string>, string>, 
		privateKey);
	t.is(decrypted, ERRS.INVALID_DECRYPT, 'is invalid decrypt');
});