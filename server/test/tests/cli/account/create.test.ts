import { genDBWithPW, hasCreatedDBWithPW, hasCreatedAccount } from '../../../lib/db';
import { captureURIs, genTempDatabase } from '../../../lib/util';
import { DEFAULT_EMAIL } from '../../../../app/lib/constants';
import { genRandomString } from '../../../../app/lib/util';
import { ProcRunner } from '../../../lib/procrunner';
import { assert } from 'chai';

const uris = captureURIs(test);
test('print an error when no account is passed', async t => {
	const uri = await genTempDatabase(t);
	uris.push(uri);

	const proc = new ProcRunner([
		'account',
		'-d', uri,
		'create'
	]);
	proc.expectWrite('Please supply the email of the account to edit through -a or --account');
	proc.expectExit(1);

	await proc.run();
	proc.check();
});
test('fail if the database password is wrong when passed', async t => {
	const uri = await genTempDatabase(t);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	const wrongPw = dbpw === 'wrongpwwrongpwwrongpwwrongpwwron' ? 
		'otherwrongpwotherwrongpwotherwro' : 
		'wrongpwwrongpwwrongpwwrongpwwron';

	const proc = new ProcRunner([
		'account',
		'create',
		'-d', uri,
		'-a', DEFAULT_EMAIL,
		'-p', wrongPw
	]);
	proc.expectWrite('Database can\'t be decrypted with that key; password invalid');
	proc.expectExit(1);

	await proc.run();
	proc.check();
});
test('fail if the database password is wrong when entered', async t => {
	const uri = await genTempDatabase(t);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	const wrongPw = dbpw === 'wrongpwwrongpwwrongpwwrongpwwron' ? 
		'otherwrongpwotherwrongpwotherwro' : 'wrongpwwrongpwwrongpwwrongpwwron';

	const proc = new ProcRunner([
		'account', 
		'create',
		'-d', uri,
		'-a', DEFAULT_EMAIL
	]);
	proc.expectWrite('Attempt 1/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(wrongPw + '1');
	proc.expectWrite('Attempt 2/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(wrongPw + '2');
	proc.expectWrite('Attempt 3/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(wrongPw + '3');
	proc.expectWrite('Attempt 4/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(wrongPw + '4');
	proc.expectWrite('Attempt 5/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(wrongPw + '5');
	proc.expectWrite('Database can\'t be decrypted with that key; password invalid');
	proc.expectExit(1);

	await proc.run();
	proc.check();
});
test('it is possible to enter the password manually', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(25);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	const proc = new ProcRunner([
		'account', 
		'create',
		'-d', uri,
		'-a', DEFAULT_EMAIL
	]);
	proc.expectWrite('Attempt 1/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(dbpw);

	proc.expectWrite('Please enter a master password');
	proc.expectRead(userpw);
	proc.expectWrite('Please confirm your password');
	proc.expectRead(userpw);
	proc.expectWrite('Successfully created user!');
	proc.captureRegExp(/Your reset key is ((\w|\d)+)/)
	proc.expectWrite('Do not lose this');
	proc.expectExit(0);

	await proc.run();
	proc.check();

	const [ [, resetKey ] ] = proc.getRegexps();
	await hasCreatedAccount(t, {
		dbpw, userpw, resetKey, uri
	});
});
test('work when entering pasword correctly the third time', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	const wrongPw = dbpw === 'wrongpwwrongpwwrongpwwrongpwwron' ? 
		'otherwrongpwotherwrongpwotherwro' : 'wrongpwwrongpwwrongpwwrongpwwron';
	const proc = new ProcRunner([
		'account', 
		'create',
		'-d', uri,
		'-a', DEFAULT_EMAIL
	]);
	proc.expectWrite('Attempt 1/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(wrongPw);
	proc.expectWrite('Attempt 2/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(wrongPw);
	proc.expectWrite('Attempt 3/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(dbpw);

	proc.expectWrite('Please enter a master password');
	proc.expectRead(userpw);
	proc.expectWrite('Please confirm your password');
	proc.expectRead(userpw);
	proc.expectWrite('Successfully created user!');
	proc.captureRegExp(/Your reset key is ((\w|\d)+)/)
	proc.expectWrite('Do not lose this');
	proc.expectExit(0);

	await proc.run();
	proc.check();

	const [ [, resetKey ] ] = proc.getRegexps();
	await hasCreatedAccount(t, {
		dbpw, userpw, resetKey, uri
	})
})
test('it is possible to pass the password', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	const proc = new ProcRunner([
		'account', 
		'create',
		'-d', uri,
		'-a', DEFAULT_EMAIL,
		'-p', dbpw
	]);
	proc.expectWrite('Please enter a master password');
	proc.expectRead(userpw);
	proc.expectWrite('Please confirm your password');
	proc.expectRead(userpw);
	proc.expectWrite('Successfully created user!');
	proc.captureRegExp(/Your reset key is ((\w|\d)+)/)
	proc.expectWrite('Do not lose this');
	proc.expectExit(0);

	await proc.run();
	proc.check();

	const [ [, resetKey ] ] = proc.getRegexps();
	await hasCreatedAccount(t, {
		dbpw, userpw, resetKey, uri
	})
});
test('ask for a new database password if not set yet', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	const dbpw = genRandomString(15);
	uris.push(uri);

	const proc = new ProcRunner([
		'account', 
		'create',
		'-d', uri,
		'-a', DEFAULT_EMAIL
	]);
	proc.expectWrite('Attempt 1/5');
	proc.expectWrite('Please enter a new database password');
	proc.expectRead(dbpw)
	proc.expectWrite('Empty database, creating with this key');

	proc.expectWrite('Please enter a master password');
	proc.expectRead(userpw);
	proc.expectWrite('Please confirm your password');
	proc.expectRead(userpw);
	proc.expectWrite('Successfully created user!');
	proc.captureRegExp(/Your reset key is ((\w|\d)+)/)
	proc.expectWrite('Do not lose this');
	proc.expectExit(0);

	await proc.run();
	proc.check();

	assert.isTrue(await hasCreatedDBWithPW(dbpw, uri),
		'the database has been initialized with given password');
	const [ [, resetKey ] ] = proc.getRegexps();
	await hasCreatedAccount(t, {
		dbpw, userpw, resetKey, uri
	});
});
test('use the passed password to initialize the database if not set yet', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	uris.push(uri);

	const dbpw = genRandomString(25);

	const proc = new ProcRunner([
		'account', 
		'create',
		'-d', uri,
		'-a', DEFAULT_EMAIL,
		'-p', dbpw
	]);
	proc.expectWrite('Empty database, creating with this key');

	proc.expectWrite('Please enter a master password');
	proc.expectRead(userpw);
	proc.expectWrite('Please confirm your password');
	proc.expectRead(userpw);
	proc.expectWrite('Successfully created user!');
	proc.captureRegExp(/Your reset key is ((\w|\d)+)/)
	proc.expectWrite('Do not lose this');
	proc.expectExit(0);

	await proc.run();
	proc.check();

	assert.isTrue(await hasCreatedDBWithPW(dbpw, uri),
		'the database has been initialized with given password');

	const [ [, resetKey ] ] = proc.getRegexps();
	await hasCreatedAccount(t, {
		dbpw, userpw, resetKey, uri
	});
});