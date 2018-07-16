import { captureURIs, genUserAndDb } from '../../lib/util';
import { ProcRunner } from '../../lib/procrunner';
import { test } from 'ava';

const uris = captureURIs(test);
test('server can be started', async t => {
	const { dbpw, uri, http } = await genUserAndDb(t);
	uris.push(uri);
	const proc = new ProcRunner(t, [
		'server',
		'--http', http + '',
		'--no-rate-limit',
		'-p', dbpw,
		'-d', uri
	]);

	proc.expectWrite(`HTTP server listening on port ${http}`)
	proc.expectExit(-1);

	await proc.run(10000);

	proc.check();
});