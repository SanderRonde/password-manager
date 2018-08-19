import { UI_TEST_PORT } from './lib/ui-test-const';
import { createServer } from 'http-server';
import * as cypress from 'cypress';
import * as path from 'path';

const server = createServer({
	root: path.join(__dirname, 'served/')
});
server.listen(UI_TEST_PORT, () => {
	cypress.run({
		record: true
	}).then(() => {
		server.close();
		process.exit();
	});
});