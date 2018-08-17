import { serverTest } from "./tests/server/server.test";
import { enviromentTests } from "./tests/env.test";
import { cliTest } from "./tests/cli.test";

describe('Server', () => {
	enviromentTests();
	cliTest();
	serverTest();
});