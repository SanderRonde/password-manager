import { EXECUTABLE_SPECIFIC_HELP } from '../lib/consts';
import { genConfigTest } from './cli/genconfig.test';
import { cliVersionTest } from './cli/version.test';
import { accountTest } from './cli/account.test';
import { backupTest } from './cli/backup.test';
import { ProcRunner } from '../lib/procrunner';

export function cliTest() {
	describe('CLI', function() {
		this.timeout(1000 * 120);
		this.slow(1000 * 30);

		it('display help information when called without args', async () => {
			const proc = new ProcRunner([]);
			for (const line of EXECUTABLE_SPECIFIC_HELP.split('\n').slice(0, -1)) {
				proc.expectWrite(line);
			}
			proc.expectExit(0);

			await proc.run();
			proc.check();
		});
		cliVersionTest();
		genConfigTest();
		backupTest();
		accountTest();
	});
}