import { VERSION } from '../../app/lib/constants';
import { DEFAULT_HELP } from '../lib/consts';
import { MainExports } from '../../app/main';
import importFresh = require('import-fresh');
import { captureLogs } from '../lib/util';
// import { clearDB } from '../lib/db';

const { main } = importFresh('../../app/main') as MainExports;

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

					main(['/usr/bin/node', './app/main.js', '-v'], log, true);
				});
			});
		});
	});
}