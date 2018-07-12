import { isMongoConnected, clearDB, genDBWithPW, hasCreatedDBWithPW } from '../lib/db';
import { VERSION, TEST_DB_URI } from '../../app/lib/constants';
import { EXECUTABLE_SPECIFIC_HELP } from '../lib/consts';
import { ProcRunner } from '../lib/procrunner';
import { assert } from 'chai';

export function cliTest() {
	describe('Env Checks', function() {
		this.timeout(10000);
		this.slow(9000);
		it('should have set up mongo', async () => {
			assert.isTrue(await isMongoConnected());
		});
	});
	describe('CLI Test', function() {
		this.timeout(10000);
		this.slow(9000);

		it('should display help information when called without args', async () => {
			const proc = new ProcRunner([]);
			for (const line of EXECUTABLE_SPECIFIC_HELP.split('\n').slice(0, -1)) {
				proc.expectWrite(line);
			}
			proc.expectExit(0);

			await proc.run();
			proc.check();
		});
		describe('Account', function() {
			it('should print an error when no command is passed', async () => {
				const proc = new ProcRunner(['account']);
				proc.expectWrite();
				proc.expectWrite('\terror: missing required argument `create/delete\'');
				proc.expectWrite();
				proc.expectExit(1);

				await proc.run();
				proc.check();
			}); 
			it('should print an error when a non-command is used', async () => {
				const proc = new ProcRunner(['account', 'noncommand']);
				proc.expectWrite('Invalid account action, choose "create" or "delete"');
				proc.expectExit(1);

				await proc.run();
				proc.check();
			});
			describe('Create', () => {
				beforeEach(async () => {
					await clearDB();
				});	
				it('should print an error when no account is passed', async () => {
					const proc = new ProcRunner([
						'account',
						'-d', TEST_DB_URI,
						'create'
					]);
					proc.expectWrite('Please supply the email of the account to edit through -a or --account');
					proc.expectExit(1);

					await proc.run();
					proc.check();
				});
				it('should fail if the database password is wrong when passed', async () => {
					const pw = await genDBWithPW();
					const wrongPw = pw === 'wrongpwwrongpwwrongpwwrongpwwron' ? 
						'otherwrongpwotherwrongpwotherwro' : 
						'wrongpwwrongpwwrongpwwrongpwwron';

					const proc = new ProcRunner([
						'account',
						'create',
						'-d', TEST_DB_URI,
						'-a', 'some@email.com',
						'-p', wrongPw
					]);
					proc.expectWrite('Database can\'t be decrypted with that key; password invalid');
					proc.expectExit(1);

					await proc.run();
					proc.check();
				});
				it('should fail if the database password is wrong when entered', async function() {
					this.timeout(30000);

					const pw = await genDBWithPW();
					const wrongPw = pw === 'wrongpwwrongpwwrongpwwrongpwwron' ? 
						'otherwrongpwotherwrongpwotherwro' : 'wrongpwwrongpwwrongpwwrongpwwron';

					const proc = new ProcRunner([
						'account', 
						'create',
						'-d', TEST_DB_URI,
						'-a', 'some@email.com'
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
				it('should be possible to enter the password manually', async () => {

					const pw = await genDBWithPW();
					const proc = new ProcRunner([
						'account', 
						'create',
						'-d', TEST_DB_URI,
						'-a', 'some@email.com'
					]);
					proc.expectWrite('Attempt 1/5');
					proc.expectWrite('Please enter the database password');
					proc.expectRead(pw);

					proc.expectWrite('Please enter a master password');
					proc.expectRead('somepw');
					proc.expectWrite('Please confirm your password');
					proc.expectRead('somepw');
					proc.expectWrite('Successfully created user!');
					proc.expectWrite(/Your reset key is (\w|\d)+/)
					proc.expectWrite('Do not lose this');
					proc.expectExit(0);

					await proc.run();
					proc.check();
				});
				it('should be possible to enter the password through -p', async () => {
					this.timeout(30000);

					const pw = await genDBWithPW();
					const proc = new ProcRunner([
						'account', 
						'create',
						'-d', TEST_DB_URI,
						'-a', 'some@email.com',
						'-p', pw
					]);
					proc.expectWrite('Please enter a master password');
					proc.expectRead('somepw');
					proc.expectWrite('Please confirm your password');
					proc.expectRead('somepw');
					proc.expectWrite('Successfully created user!');
					proc.expectWrite(/Your reset key is (\w|\d)+/)
					proc.expectWrite('Do not lose this');
					proc.expectExit(0);

					await proc.run();
					proc.check();
				});
				it('should ask for a new database password if not set yet', async () => {
					const proc = new ProcRunner([
						'account', 
						'create',
						'-d', TEST_DB_URI,
						'-a', 'some@email.com'
					]);
					proc.expectWrite('Attempt 1/5');
					proc.expectWrite('Please enter a new database password');
					proc.expectRead('dbpw')
					proc.expectWrite('Empty database, creating with this key');

					proc.expectWrite('Please enter a master password');
					proc.expectRead('somepw');
					proc.expectWrite('Please confirm your password');
					proc.expectRead('somepw');
					proc.expectWrite('Successfully created user!');
					proc.expectWrite(/Your reset key is (\w|\d)+/)
					proc.expectWrite('Do not lose this');
					proc.expectExit(0);

					await proc.run();
					proc.check();

					assert.isTrue(await hasCreatedDBWithPW('dbpw'),
						'the database has been initialized with given password');
				});
				it('should use the passed password to initialize the database if not set yet', async () => {
					const proc = new ProcRunner([
						'account', 
						'create',
						'-d', TEST_DB_URI,
						'-a', 'some@email.com',
						'-p', 'dbpw'
					]);
					proc.expectWrite('Empty database, creating with this key');

					proc.expectWrite('Please enter a master password');
					proc.expectRead('somepw');
					proc.expectWrite('Please confirm your password');
					proc.expectRead('somepw');
					proc.expectWrite('Successfully created user!');
					proc.expectWrite(/Your reset key is (\w|\d)+/)
					proc.expectWrite('Do not lose this');
					proc.expectExit(0);

					await proc.run();
					proc.check();

					assert.isTrue(await hasCreatedDBWithPW('dbpw'),
						'the database has been initialized with given password');
				});
			});
			describe('Delete', () => {
				beforeEach(async () => {
					await clearDB();
				});
			});
		});
		describe('Version', () => {
			it('should display the version when calling it with -v', async () => {
				const proc = new ProcRunner(['-v']);
				proc.expectWrite(VERSION);
				proc.expectExit(0);
				await proc.run();
				proc.check();
			});
		});
	});
}
