import { VERSION } from '../../../app/lib/constants';
import { ProcRunner } from '../../lib/procrunner';

export function cliVersionTest() {
	describe('Version', () => {
		it('display the version when calling it with -v', async () => {
			const proc = new ProcRunner(['-v']);
			proc.expectWrite(VERSION);
			proc.expectExit(0);
			await proc.run();
			proc.check();
		});
	});
}