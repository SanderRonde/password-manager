import { EXECUTABLE_SPECIFIC_HELP } from '../lib/consts';
import { ProcRunner } from '../lib/procrunner';
import { test } from 'ava';

test('display help information when called without args', async t => {
	const proc = new ProcRunner(t, []);
	for (const line of EXECUTABLE_SPECIFIC_HELP.split('\n').slice(0, -1)) {
		proc.expectWrite(line);
	}
	proc.expectExit(0);

	await proc.run();
	proc.check();
});