import { UI_TEST_PORT } from './lib/ui-test-const';
import { createServer } from 'http-server';
import * as cypress from 'cypress';
import * as path from 'path';
import { runCypressServer } from './run-cypress-server';

const httpServer = createServer({
	root: path.join(__dirname, 'served/')
});
httpServer.listen(UI_TEST_PORT, async () => {
	await runCypressServer();	

	cypress.run({
		record: true
	}).then((results) => {
		httpServer.close();
		process.exit(results.totalFailed);
	});
});