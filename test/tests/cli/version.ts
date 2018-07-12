import { VERSION } from '../../../app/lib/constants';
import { ProcRunner } from '../../lib/procrunner';
import { test } from 'ava';

test('display the version when calling it with -v', async t => {
	const proc = new ProcRunner(t, ['-v']);
	proc.expectWrite(VERSION);
	proc.expectExit(0);
	await proc.run();
	proc.check();
});