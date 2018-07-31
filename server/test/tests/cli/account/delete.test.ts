import { genDBWithPW, hasCreatedDBWithPW, genMockAcount, hasDeletedAccount, getDB } from '../../../lib/db';
import { captureURIs, genTempDatabase, getCollectionLength } from '../../../lib/util';
import { DEFAULT_EMAIL } from '../../../../app/lib/constants';
import { genRandomString } from '../../../../app/lib/util';
import { ProcRunner } from '../../../lib/procrunner';
import { test } from 'ava';

const uris = captureURIs(test);
test('print an error when no account is passed', async t => {
	const uri = await genTempDatabase(t);
	uris.push(uri);

	const proc = new ProcRunner(t, [
		'account',
		'-d', uri,
		'delete'
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

	const proc = new ProcRunner(t, [
		'account',
		'delete',
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

	const proc = new ProcRunner(t, [
		'account', 
		'delete',
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
	await genMockAcount({
		userpw,
		dbpw,
		uri
	});
	const proc = new ProcRunner(t, [
		'account', 
		'delete',
		'-d', uri,
		'-a', DEFAULT_EMAIL
	]);
	proc.expectWrite('Attempt 1/5');
	proc.expectWrite('Please enter the database password');
	proc.expectRead(dbpw);

	proc.expectWrite('Attempt 1/3');
	proc.expectWrite('Please enter the account\'s password');
	proc.expectRead(userpw);
	proc.expectWrite(`Deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectWrite('Are you sure?');
	proc.expectRead('');
	proc.expectWrite('Are you very very sure?');
	proc.expectRead('');
	proc.expectWrite('Deleting instances...');
	proc.expectWrite('Deleting passwords...');
	proc.expectWrite('Deleting user record...');
	proc.expectWrite(`Done deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectExit(0);

	await proc.run();
	proc.check();

	await hasDeletedAccount(t, uri);
});
test('work when entering pasword correctly the third time', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	await genMockAcount({
		userpw,
		dbpw,
		uri
	});
	const wrongPw = dbpw === 'wrongpwwrongpwwrongpwwrongpwwron' ? 
		'otherwrongpwotherwrongpwotherwro' : 'wrongpwwrongpwwrongpwwrongpwwron';
	const proc = new ProcRunner(t, [
		'account', 
		'delete',
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

	proc.expectWrite('Attempt 1/3');
	proc.expectWrite('Please enter the account\'s password');
	proc.expectRead(userpw);
	proc.expectWrite(`Deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectWrite('Are you sure?');
	proc.expectRead('');
	proc.expectWrite('Are you very very sure?');
	proc.expectRead('');
	proc.expectWrite('Deleting instances...');
	proc.expectWrite('Deleting passwords...');
	proc.expectWrite('Deleting user record...');
	proc.expectWrite(`Done deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectExit(0);

	await proc.run();
	proc.check();

	await hasDeletedAccount(t, uri);
})
test('it is possible to pass the password', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	await genMockAcount({
		userpw,
		dbpw,
		uri
	});
	const proc = new ProcRunner(t, [
		'account', 
		'delete',
		'-d', uri,
		'-a', DEFAULT_EMAIL,
		'-p', dbpw
	]);
	proc.expectWrite('Attempt 1/3');
	proc.expectWrite('Please enter the account\'s password');
	proc.expectRead(userpw);
	proc.expectWrite(`Deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectWrite('Are you sure?');
	proc.expectRead('');
	proc.expectWrite('Are you very very sure?');
	proc.expectRead('');
	proc.expectWrite('Deleting instances...');
	proc.expectWrite('Deleting passwords...');
	proc.expectWrite('Deleting user record...');
	proc.expectWrite(`Done deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectExit(0);

	await proc.run();
	proc.check();

	await hasDeletedAccount(t, uri);
});
test('ask for a new database password if not set yet', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	const dbpw = genRandomString(15);
	uris.push(uri);
	await genMockAcount({
		userpw,
		dbpw,
		uri
	});

	const proc = new ProcRunner(t, [
		'account', 
		'delete',
		'-d', uri,
		'-a', DEFAULT_EMAIL
	]);
	proc.expectWrite('Attempt 1/5');
	proc.expectWrite('Please enter a new database password');
	proc.expectRead(dbpw)
	proc.expectWrite('Empty database, creating with this key');

	proc.expectWrite('Attempt 1/3');
	proc.expectWrite('Please enter the account\'s password');
	proc.expectRead(userpw);
	proc.expectWrite(`Deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectWrite('Are you sure?');
	proc.expectRead('');
	proc.expectWrite('Are you very very sure?');
	proc.expectRead('');
	proc.expectWrite('Deleting instances...');
	proc.expectWrite('Deleting passwords...');
	proc.expectWrite('Deleting user record...');
	proc.expectWrite(`Done deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectExit(0);

	await proc.run();
	proc.check();

	t.true(await hasCreatedDBWithPW(dbpw, uri),
		'the database has been initialized with given password');
	await hasDeletedAccount(t, uri);
});
test('use the passed password to initialize the database if not set yet', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	uris.push(uri);

	const dbpw = genRandomString(25);
	await genMockAcount({
		userpw,
		dbpw,
		uri
	});

	const proc = new ProcRunner(t, [
		'account', 
		'delete',
		'-d', uri,
		'-a', DEFAULT_EMAIL,
		'-p', dbpw
	]);
	proc.expectWrite('Empty database, creating with this key');

	proc.expectWrite('Attempt 1/3');
	proc.expectWrite('Please enter the account\'s password');
	proc.expectRead(userpw);
	proc.expectWrite(`Deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectWrite('Are you sure?');
	proc.expectRead('');
	proc.expectWrite('Are you very very sure?');
	proc.expectRead('');
	proc.expectWrite('Deleting instances...');
	proc.expectWrite('Deleting passwords...');
	proc.expectWrite('Deleting user record...');
	proc.expectWrite(`Done deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectExit(0);

	await proc.run();
	proc.check();

	t.true(await hasCreatedDBWithPW(dbpw, uri),
		'the database has been initialized with given password');
	await hasDeletedAccount(t, uri);
});
test('cancel the deletion and restore deleted items when instance changes fail', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	await genMockAcount({
		userpw,
		dbpw,
		uri
	});
	const proc = new ProcRunner(t, [
		'account', 
		'delete',
		'-d', uri,
		'-a', DEFAULT_EMAIL,
		'-p', dbpw,
		'--debug'
	], {
		env: {
			FAIL_ON_INSTANCE: true
		}
	});
	proc.expectWrite('Attempt 1/3');
	proc.expectWrite('Please enter the account\'s password');
	proc.expectRead(userpw);
	proc.expectWrite(`Deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectWrite('Are you sure?');
	proc.expectRead('');
	proc.expectWrite('Are you very very sure?');
	proc.expectRead('');
	proc.expectWrite('Deleting instances...');
	proc.expectWrite('Failed to delete an instance, undoing this operation');
	proc.expectWrite('Done salvaging');
	proc.expectExit(1);

	await proc.run();
	proc.check();

	const { db, done } = await getDB(uri);
	t.is(await getCollectionLength(db.collection('passwords')), 5,
		'hasn\'t deleted any passwords');
	t.is(await getCollectionLength(db.collection('instances')), 5,
		'hasn\'t deleted any instances');
	t.is(await getCollectionLength(db.collection('users')), 3,
		'hasn\'t deleted any users');
	done();
});
test('cancel the deletion and restore deleted items when password changes fail', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	await genMockAcount({
		userpw,
		dbpw,
		uri
	});
	const proc = new ProcRunner(t, [
		'account', 
		'delete',
		'-d', uri,
		'-a', DEFAULT_EMAIL,
		'-p', dbpw,
		'--debug'
	], {
		env: {
			FAIL_ON_PASSWORDS: true
		}
	});
	proc.expectWrite('Attempt 1/3');
	proc.expectWrite('Please enter the account\'s password');
	proc.expectRead(userpw);
	proc.expectWrite(`Deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectWrite('Are you sure?');
	proc.expectRead('');
	proc.expectWrite('Are you very very sure?');
	proc.expectRead('');
	proc.expectWrite('Deleting instances...');
	proc.expectWrite('Deleting passwords...');
	proc.expectWrite('Failed to delete passwords, restoring instances');
	proc.expectWrite(`Done salvaging`);
	proc.expectExit(1);

	await proc.run();
	proc.check();

	const { db, done } = await getDB(uri);
	t.is(await getCollectionLength(db.collection('passwords')), 5,
		'hasn\'t deleted any passwords');
	t.is(await getCollectionLength(db.collection('instances')), 5,
		'hasn\'t deleted any instances');
	t.is(await getCollectionLength(db.collection('users')), 3,
		'hasn\'t deleted any users');
	done();
});
test('cancel the deletion and restore deleted items when account changes fail', async t => {
	const uri = await genTempDatabase(t);
	const userpw = genRandomString(15);
	uris.push(uri);

	const dbpw = await genDBWithPW(uri);
	await genMockAcount({
		userpw,
		dbpw,
		uri
	});
	const proc = new ProcRunner(t, [
		'account', 
		'delete',
		'-d', uri,
		'-a', DEFAULT_EMAIL,
		'-p', dbpw,
		'--debug'
	], {
		env: {
			FAIL_ON_ACCOUNT: true
		}
	});
	proc.expectWrite('Attempt 1/3');
	proc.expectWrite('Please enter the account\'s password');
	proc.expectRead(userpw);
	proc.expectWrite(`Deleting user with email "${DEFAULT_EMAIL}"`);
	proc.expectWrite('Are you sure?');
	proc.expectRead('');
	proc.expectWrite('Are you very very sure?');
	proc.expectRead('');
	proc.expectWrite('Deleting instances...');
	proc.expectWrite('Deleting passwords...');
	proc.expectWrite('Deleting user record...');
	proc.expectWrite(`Failed to delete account, restoring instances and passwords`);
	proc.expectWrite('Done salvaging');
	proc.expectExit(1);

	await proc.run();
	proc.check();

	const { db, done } = await getDB(uri);
	t.is(await getCollectionLength(db.collection('passwords')), 5,
		'hasn\'t deleted any passwords');
	t.is(await getCollectionLength(db.collection('instances')), 5,
		'hasn\'t deleted any instances');
	t.is(await getCollectionLength(db.collection('users')), 3,
		'hasn\'t deleted any users');
	done();
});