import { captureURIs, genTempDatabase, captureCreatedFiles } from '../../../lib/util';
import { genRandomString } from '../../../../app/lib/util';
import { ProcRunner } from '../../../lib/procrunner';
import { genDBWithPW } from '../../../lib/db';
import * as path from 'path'
import { assert } from 'chai';
import * as fs from 'fs'

const uris = captureURIs(test);
const files = captureCreatedFiles(test);
test('print an error when no output is passed', async t => {
	const uri = await genTempDatabase(t);
	uris.push(uri);

	const proc = new ProcRunner(t, [
		'backup',
		'local',
		'-d', uri
	]);
	proc.expectWrite('No output was specified');
	proc.expectExit(1);

	await proc.run();
	proc.check();
});
test('creates dump with regular args', async t => {
	const uri = await genTempDatabase(t);
	uris.push(uri);
	await genDBWithPW(uri);

	const dumpName = genRandomString(10);
	const dumpPath = path.join(__dirname, `../../../temp/mongodump${dumpName}.dump`);
	files.push(dumpPath);
	const proc = new ProcRunner(t, [
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
	t.true(exists, 'dump file exists');
});