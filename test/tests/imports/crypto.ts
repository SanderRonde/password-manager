import { encrypt, encryptWithSalt, decrypt, ERRS, decryptWithSalt, pad, hash } from '../../../app/lib/crypto';
import { ENCRYPTION_ALGORITHM } from '../../../app/lib/constants';
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
test('salt-encrypted value can be decrypted', t => {
	const startValue = genRandomString(25);
	const key = genRandomString(25);
	
	const encrypted = encryptWithSalt(startValue, key, ENCRYPTION_ALGORITHM);
	const decrypted = decryptWithSalt(encrypted, key);

	t.not(decrypted, ERRS.INVALID_DECRYPT,
		'is not an invalid decrypt');
	t.is(decrypted, startValue);
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