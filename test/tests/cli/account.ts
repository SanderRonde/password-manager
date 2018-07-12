import { ProcRunner } from '../../lib/procrunner';
import { test } from 'ava';

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