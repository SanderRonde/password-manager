import { captureURIs, genUserAndDb } from '../../lib/util';
import { ProcRunner } from '../../lib/procrunner';
import { test } from 'ava';

const uris = captureURIs(test);
test.failing('server can be started', async t => {
	const { dbpw, uri, http, https } = await genUserAndDb(t);
	uris.push(uri);
	const proc = new ProcRunner(t, [
		'server',
		'--http', http + '',
		'--https', https + '',
		'--no-rate-limit',
		'-p', dbpw,
		'-d', uri
	]);

	proc.expectWrite(`HTTP server listening on port ${http}`)
	proc.expectWrite(`HTTPS server listening on port ${https}`)
	proc.expectExit(-1);

	await proc.run(5000);

	proc.check();
});