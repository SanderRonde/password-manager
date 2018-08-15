import { EXECUTABLE_SPECIFIC_HELP } from '../lib/consts';
import { ProcRunner } from '../lib/procrunner';
import { it, describe } from 'mocha';

describe('server -> cli', () => {
	it('display help information when called without args', async () => {
		const proc = new ProcRunner([]);
		for (const line of EXECUTABLE_SPECIFIC_HELP.split('\n').slice(0, -1)) {
			proc.expectWrite(line);
		}
		proc.expectExit(0);

		await proc.run();
		proc.check();
	});
});