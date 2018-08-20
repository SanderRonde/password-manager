import { runCypressServer } from './run-cypress-server';
import { UI_TEST_PORT } from './lib/ui-test-const';
import { createServer } from 'http-server';
import * as cypress from 'cypress';
import * as fs from 'fs-extra';
import * as path from 'path';

const httpServer = createServer({
	root: path.join(__dirname, 'served/')
});
httpServer.listen(UI_TEST_PORT, async () => {
	await runCypressServer();	

	cypress.run({
		...JSON.parse(await fs.readFile(path.join(__dirname, '../../',
		'cypress.json'), {
			encoding: 'utf8'
		})),
		record: process.argv.indexOf('--no-record') ? false : true
	}).then((results) => {
		httpServer.close();
		process.exit(results.totalFailed);
	});
});