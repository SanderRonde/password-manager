import { captureLogs, getFreshMain } from '../lib/util';
import { VERSION } from '../../app/lib/constants';
import { DEFAULT_HELP } from '../lib/consts';
// import { clearDB } from '../lib/db';

export function cliTest() {
	describe('CLI Test', () => {
		it('should display help information when called without args', () => {
			DEFAULT_HELP;
		});
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
				return captureLogs(async ({exit, log}) => {
					log.expectWrite(VERSION);
					exit.expect(0);

					getFreshMain().main([
						'/usr/bin/node', 
						'./app/main.js',
						'-v'
					], log, true);
				});
			});
		});
	});
}