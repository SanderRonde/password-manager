import { genTempDatabase, captureURIs, getCollectionLength } from '../../lib/util';
import { hasCreatedDBWithPW, hasCreatedAccount, getDB } from '../../lib/db';
import { DEFAULT_EMAIL } from '../../../app/lib/constants';
import { genRandomString } from '../../../app/lib/util';
import { ProcRunner } from '../../lib/procrunner';
import { assert } from 'chai';

const uris = captureURIs(test);
test('print an error when no command is passed', async t => {
	const proc = new ProcRunner(t, ['account']);
	proc.expectWrite();
	proc.expectWrite('\terror: missing required argument `create/delete\'');
	proc.expectWrite();
	proc.expectExit(1);

	await proc.run();
	proc.check();
}); 
test('print an error when a non-command is used', async t => {
	const proc = new ProcRunner(t, ['account', 'noncommand']);
	proc.expectWrite('Invalid account action, choose "create" or "delete"');
	proc.expectExit(1);

	await proc.run();
	proc.check();
});
test('an added account can be deleted', async t => {
	const uri = await genTempDatabase(t);
	uris.push(uri);
	const userpw = genRandomString(15);
	const dbpw = genRandomString(15);

	await (async () => {
		const proc = new ProcRunner(t, [
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

		t.true(await hasCreatedDBWithPW(dbpw, uri),
			'the database has been initialized with given password');
		const [ [, resetKey ] ] = proc.getRegexps();
		await hasCreatedAccount(t, {
			dbpw, userpw, resetKey, uri
		});
	})();
	await (async () => {
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

		//Check if all accounts are gone
		const { db, done } = await getDB(uri);
		t.is(await getCollectionLength(db.collection('users')), 0,
			'there are no more accounts');
		done();
	})();
});