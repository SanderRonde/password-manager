import { VERSION } from '../../app/lib/constants';
import { hookIntoExit } from '../lib/util';
import { LogCapturer } from '../lib/log';
import { main } from '../../app/main';
// import { clearDB } from '../lib/db';

export function cliTest() {
	describe('CLI Test', () => {
		// beforeEach(async () => {
		// 	await clearDB();
		// });
		// describe('Account', () => {
		// 	describe('create', () => {
		// 		beforeEach(async () => {
		// 			await clearDB();
		// 		});	

		// 	});
		// 	describe('delete', () => {
		// 		beforeEach(async () => {
		// 			await clearDB();
		// 		});
		// 	});
		// });
		describe('Version', () => {
			it('should display the version when calling it with -v', () => {
				return new Promise(async (resolve, reject) => {
					debugger;
					const exit = hookIntoExit(reject);
					const log = new LogCapturer(reject)

					log.expectWrite(VERSION);
					exit.expect(0);

					main(['/usr/bin/node', './main.ts', '-v'], log, true);

					await log.finalize();
					await exit.finalize();

					resolve();
				});
			});
		});
	});
}