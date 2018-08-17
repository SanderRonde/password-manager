import { genDBWithPW, hasCreatedDBWithPW, clearDB, getDB } from '../../../lib/db';
import { genRandomString, writeBuffer } from '../../../../../app/lib/util';
import { Export } from '../../../../../app/actions/backup/export';
import { genTempDatabase, captureURIs } from '../../../lib/util';
import { ProcRunner } from '../../../lib/procrunner';
import { assert } from 'chai';
import * as path from 'path'
import * as fs from 'fs'

export function backupLoadTest() {
	describe('Load', () => {
		const dumps: string[] = [];
		async function createDummyDump(uri: string) {
			const dumpPath = path.join(__dirname,
				`../../../temp/dummpydump${genRandomString(25)}.dump`);
			dumps.push(dumpPath);
			const dbpw = await genDBWithPW(uri);
			const data = await Export.exportDatabase(uri, true);
			await writeBuffer(dumpPath, data);
			return {
				dumpPath, dbpw 
			};
		}

		const uris = captureURIs();
		it('print an error when no input is passed', async () => {
			const uri = await genTempDatabase();
			uris.push(uri);

			const proc = new ProcRunner([
				'backup',
				'load',
				'-d', uri
			]);
			proc.expectWrite('No input was specified');
			proc.expectExit(1);

			await proc.run();
			proc.check();
		});
		it('print an error when a config file was passed', async () => {
			const uri = await genTempDatabase();
			uris.push(uri);

			const proc = new ProcRunner([
				'backup',
				'load',
				'-c', path.join(__dirname, '../../../dummies/load.config.json'),
				'-d', uri
			]);
			proc.expectWrite('You specified a config file but you\'re using' + 
				'the "load" option. This seems a bit conflicting,' +
				' remove the config option to continue');
			proc.expectExit(1);

			await proc.run();
			proc.check();
		});
		it('fail when input file does not exist', async () => {
			const uri = await genTempDatabase();
			uris.push(uri);

			const proc = new ProcRunner([
				'backup',
				'load',
				'-i', path.join(__dirname, '../../../dummies/empty.file'),
				'-d', uri,
			]);
			proc.expectWrite('Reading file...');
			proc.expectWrite('Failed to find input file');
			proc.expectExit(1);

			await proc.run();
			proc.check();
		});
		it('succeed when restoring a passwordless backup', async () => {
			const uri = await genTempDatabase();
			uris.push(uri);
			const { dumpPath, dbpw } = await createDummyDump(uri);

			//Clear source database
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
		});
		after('delete dummy dumps', async () => {
			await Promise.all(dumps.map((dump) => {
				return new Promise((resolve, reject) => {
					fs.unlink(dump, (err) => {
						if (err) {
							reject(err);
						} else {
							resolve();
						}
					});
				});
			}));
		});
	});
}