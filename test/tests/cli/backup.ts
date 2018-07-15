import { ProcRunner } from '../../lib/procrunner';
import { test } from 'ava';

test('print an error when no command is passed', async t => {
	const proc = new ProcRunner(t, ['backup']);
	proc.expectWrite();
	proc.expectWrite('\terror: missing required argument `load/googledrive/local\'');
	proc.expectWrite();
	proc.expectExit(1);

	await proc.run();
	proc.check();
}); 
test('print an error when a non-command is used', async t => {
	const proc = new ProcRunner(t, ['backup', 'noncommand']);
	proc.expectWrite('Invalid backup method, choose "load", "drive" or "local"');
	proc.expectExit(1);

	await proc.run();
	proc.check();
});