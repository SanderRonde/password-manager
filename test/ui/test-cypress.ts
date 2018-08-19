import { UI_TEST_PORT, MAIN_SERVER_PORT } from './lib/ui-test-const';
import { genTempDatabase } from '../../server/test/unit/lib/util';
import { getDatabase } from '../../server/app/database/database';
import { Server } from '../../server/app/actions/server/server';
import { createServer } from 'http-server';
import * as cypress from 'cypress';
import * as path from 'path';

const server = createServer({
	root: path.join(__dirname, 'served/')
});
server.listen(UI_TEST_PORT, async () => {
	const uri = await genTempDatabase()
	await Server.run(await getDatabase(uri,
		'somepw', true, false), {
			http: MAIN_SERVER_PORT,
			https: 443,
			database: uri,
			config: '',
			dbpath: uri,
			ratelimit: true,
			databaseless: true,
			debug: false,
			development: false,
			httpsOnly: false,
			isConfig: true
		});

	cypress.run({
		record: true
	}).then((results) => {
		server.close();
		process.exit(results.totalFailed);
	});
});