import { serverTest } from "./tests/server/server.test";
import { enviromentTests } from "./tests/env.test";
import { cliTest } from "./tests/cli.test";

export function allServerTest() {
	describe('Server', function() {
		this.retries(1);
		
		enviromentTests();
		cliTest();
		serverTest();
	});
}

if (require.main === module) {
	serverTest();
}