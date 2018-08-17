import { genTempDatabase, captureURIs, captureCreatedFiles } from '../../lib/util';
import { genDBWithPW, clearDB, getDB, hasCreatedDBWithPW } from '../../lib/db';
import { genRandomString } from '../../../../app/lib/util';
import { backupLocalTest } from './backup/local.test';
import { backupLoadTest } from './backup/load.test';
import { ProcRunner } from '../../lib/procrunner';
import { assert } from 'chai';
import * as path from 'path'
import * as fs from 'fs'

export function backupTest() {
	describe('Backup', () => {
		const uris = captureURIs();
		const files = captureCreatedFiles();
		it('print an error when no command is passed', async () => {
			const proc = new ProcRunner(['backup']);
			proc.expectWrite();
			proc.expectWrite('\terror: missing required argument `load/googledrive/local\'');
			proc.expectWrite();
			proc.expectExit(1);

			await proc.run();
			proc.check();
		}); 
		it('print an error when a non-command is used', async () => {
			const proc = new ProcRunner(['backup', 'noncommand']);
			proc.expectWrite('Invalid backup method, choose "load", "drive" or "local"');
			proc.expectExit(1);

			await proc.run();
			proc.check();
		});
		it('a backupped file can be used to restore', async () => {
			const dumpName = genRandomString(10);
			const dumpPath = path.join(__dirname, `../../../temp/mongodump${dumpName}.dump`);
			const uri = await genTempDatabase();
			uris.push(uri);
			const dbpw = await genDBWithPW(uri);
			await (async () => {
				files.push(dumpPath);
				const proc = new ProcRunner([
					'backup',
					'local',
					'-d', uri,
					'-o', dumpPath
				]);
				proc.expectWrite('Dumping...');
				proc.expectWrite('Writing file...');
				proc.expectWrite('Done writing file');
				proc.expectExit(0);

				await proc.run();
				proc.check();

				const exists = await new Promise<boolean>((resolve) => {
					fs.exists(dumpPath, (exists) => {
						resolve(exists);
					});
				});
				assert.isTrue(exists, 'dump file exists');
			})();
			await (async () => {
				await clearDB(uri);

				const { db, done } = await getDB(uri);
				assert.strictEqual((await db.collection('meta').find().toArray()).length, 0,
					'meta collection is empty');
				done();

				const proc = new ProcRunner([
					'backup',
					'load',
					'-i', dumpPath,
					'-d', uri
				]);
				proc.expectWrite('Reading file...');
				proc.expectWrite('Restoring...');
				proc.expectWrite('Done!');
				proc.expectExit(0);

				await proc.run();
				proc.check();

				//Check if the database was actually created
				assert.isTrue(await hasCreatedDBWithPW(dbpw, uri));
			})();
		});
		backupLoadTest();
		backupLocalTest();
	});
}