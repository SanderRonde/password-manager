import { genDBWithPW, hasCreatedDBWithPW, genMockAcount, hasDeletedAccount, getDB } from '../../../lib/db';
import { captureURIs, genTempDatabase, getCollectionLength } from '../../../lib/util';
import { DEFAULT_EMAIL } from '../../../../../app/lib/constants';
import { genRandomString } from '../../../../../app/lib/util';
import { ProcRunner } from '../../../lib/procrunner';
import { assert } from 'chai';

export function accountDeleteTest() {
	describe('Delete', () => {
		const uris = captureURIs();
		it('print an error when no account is passed', async () => {
			const uri = await genTempDatabase();
			uris.push(uri);

			const proc = new ProcRunner([
				'account',
				'-d', uri,
				'delete'
			]);
			proc.expectWrite('Please supply the email of the account to edit through -a or --account');
			proc.expectExit(1);

			await proc.run();
			proc.check();
		});
		it('fail if the database password is wrong when passed', async () => {
			const uri = await genTempDatabase();
			uris.push(uri);

			const dbpw = await genDBWithPW(uri);
			const wrongPw = dbpw === 'wrongpwwrongpwwrongpwwrongpwwron' ? 
				'otherwrongpwotherwrongpwotherwro' : 'wrongpwwrongpwwrongpwwrongpwwron';

			const proc = new ProcRunner([
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
		it('fail if the database password is wrong when entered', async () => {
			const uri = await genTempDatabase();
			uris.push(uri);

			const dbpw = await genDBWithPW(uri);
			const wrongPw = dbpw === 'wrongpwwrongpwwrongpwwrongpwwron' ? 
				'otherwrongpwotherwrongpwotherwro' : 'wrongpwwrongpwwrongpwwrongpwwron';

			const proc = new ProcRunner([
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
		it('it is possible to enter the password manually', async () => {
			const uri = await genTempDatabase();
			const userpw = genRandomString(25);
			uris.push(uri);

			const dbpw = await genDBWithPW(uri);
			await genMockAcount({
				userpw,
				dbpw,
				uri
			});
			const proc = new ProcRunner([
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

			await hasDeletedAccount(uri);
		});
		it('work when entering pasword correctly the third time', async () => {
			const uri = await genTempDatabase();
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
			const proc = new ProcRunner([
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

			await hasDeletedAccount(uri);
		})
		it('it is possible to pass the password', async () => {
			const uri = await genTempDatabase();
			const userpw = genRandomString(15);
			uris.push(uri);

			const dbpw = await genDBWithPW(uri);
			await genMockAcount({
				userpw,
				dbpw,
				uri
			});
			const proc = new ProcRunner([
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

			await hasDeletedAccount(uri);
		});
		it('ask for a new database password if not set yet', async () => {
			const uri = await genTempDatabase();
			const userpw = genRandomString(15);
			const dbpw = genRandomString(15);
			uris.push(uri);
			await genMockAcount({
				userpw,
				dbpw,
				uri
			});

			const proc = new ProcRunner([
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

			assert.isTrue(await hasCreatedDBWithPW(dbpw, uri),
				'the database has been initialized with given password');
			await hasDeletedAccount(uri);
		});
		it('use the passed password to initialize the database if not set yet', async () => {
			const uri = await genTempDatabase();
			const userpw = genRandomString(15);
			uris.push(uri);

			const dbpw = genRandomString(25);
			await genMockAcount({
				userpw,
				dbpw,
				uri
			});

			const proc = new ProcRunner([
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

			assert.isTrue(await hasCreatedDBWithPW(dbpw, uri),
				'the database has been initialized with given password');
			await hasDeletedAccount(uri);
		});
		it('cancel the deletion and restore deleted items when instance changes fail', async () => {
			const uri = await genTempDatabase();
			const userpw = genRandomString(15);
			uris.push(uri);

			const dbpw = await genDBWithPW(uri);
			await genMockAcount({
				userpw,
				dbpw,
				uri
			});
			const proc = new ProcRunner([
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
			assert.strictEqual(await getCollectionLength(db.collection('passwords')), 5,
				'hasn\'t deleted any passwords');
			assert.strictEqual(await getCollectionLength(db.collection('instances')), 5,
				'hasn\'t deleted any instances');
			assert.strictEqual(await getCollectionLength(db.collection('users')), 3,
				'hasn\'t deleted any users');
			done();
		});
		it('cancel the deletion and restore deleted items when password changes fail', async () => {
			const uri = await genTempDatabase();
			const userpw = genRandomString(15);
			uris.push(uri);

			const dbpw = await genDBWithPW(uri);
			await genMockAcount({
				userpw,
				dbpw,
				uri
			});
			const proc = new ProcRunner([
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
			assert.strictEqual(await getCollectionLength(db.collection('passwords')), 5,
				'hasn\'t deleted any passwords');
			assert.strictEqual(await getCollectionLength(db.collection('instances')), 5,
				'hasn\'t deleted any instances');
			assert.strictEqual(await getCollectionLength(db.collection('users')), 3,
				'hasn\'t deleted any users');
			done();
		});
		it('cancel the deletion and restore deleted items when account changes fail', async () => {
			const uri = await genTempDatabase();
			const userpw = genRandomString(15);
			uris.push(uri);

			const dbpw = await genDBWithPW(uri);
			await genMockAcount({
				userpw,
				dbpw,
				uri
			});
			const proc = new ProcRunner([
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
			assert.strictEqual(await getCollectionLength(db.collection('passwords')), 5,
				'hasn\'t deleted any passwords');
			assert.strictEqual(await getCollectionLength(db.collection('instances')), 5,
				'hasn\'t deleted any instances');
			assert.strictEqual(await getCollectionLength(db.collection('users')), 3,
				'hasn\'t deleted any users');
			done();
		});
	});
}