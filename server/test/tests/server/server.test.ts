import { captureURIs, genUserAndDb } from '../../lib/util';
import { ProcRunner } from '../../lib/procrunner';
import http = require('http');
import { assert } from 'chai';

const uris = captureURIs(test);
test('server can be started', async t => {
	const { dbpw, uri, http } = await genUserAndDb(t);
	uris.push(uri);
	const proc = new ProcRunner(t, [
		'server',
		'--http', http + '',
		'--no-rate-limit',
		'-p', dbpw,
		'-d', uri,
		'--no-https-only'
	]);

	proc.expectWrite(`HTTP server listening on port ${http}`)
	proc.expectExit(-1);

	await proc.run(30000);

	proc.check();
});
test('requests made over HTTP are redirected to HTTPS by default', async t => {
	const { dbpw, uri, http: httpPort } = await genUserAndDb(t);
	uris.push(uri);
	const proc = new ProcRunner(t, [
		'server',
		'--http', httpPort + '',
		'--no-rate-limit',
		'-p', dbpw,
		'-d', uri
	]);

	proc.expectWrite(`HTTP server listening on port ${httpPort}`)
	proc.expectWrite('You enabled HTTPS only mode but haven\'t provided HTTPS certs,' + 
		' this means all requests are redirected to a non-existent server');
	proc.expectExit(-1);

	proc.run(Infinity);

	await new Promise((resolve, reject) => {
		const timer: NodeJS.Timer = setTimeout(() => {
			reject('Did not receive message that server is running within 120 seconds');
		}, 120000);
		proc.onText((text) => {
			if (text.startsWith('HTTP server listening on port')) {
				clearTimeout(timer);
				resolve();
			}
		});
	});
	assert.strictEqual(await new Promise<number>((resolve, reject) => {
		const req = http.request({
			port: httpPort,
			hostname: '127.0.0.1',
			method: 'GET',
			path: '/login',
		}, (res) => {
			res.setEncoding('utf8');
			res.once('end', () => {
				resolve(res.statusCode);
			});
			res.once('error', (err) => {
				reject(err);
			});
		});
		req.on('error', (err) => {
			reject(err);
		});
		req.end();
	}), 301, 'statuscode is 301');

	await proc.updateTimer(30000);

	proc.check();
});
test('requests made over HTTP are not redirected to HTTPS if disabled', async t => {
	const { dbpw, uri, http: httpPort } = await genUserAndDb(t);
	uris.push(uri);
	const proc = new ProcRunner(t, [
		'server',
		'--http', httpPort + '',
		'--no-rate-limit',
		'-p', dbpw,
		'-d', uri,
		'--no-https-only'
	]);

	proc.expectWrite(`HTTP server listening on port ${httpPort}`)
	proc.expectWrite('You enabled HTTPS only mode but haven\'t provided HTTPS certs,' + 
		' this means all requests are redirected to a non-existent server');
	proc.expectExit(-1);

	proc.run(Infinity);

	await new Promise((resolve, reject) => {
		const timer: NodeJS.Timer = setTimeout(() => {
			reject('Did not receive message that server is running within 120 seconds');
		}, 120000);
		proc.onText((text) => {
			if (text.startsWith('HTTP server listening on port')) {
				clearTimeout(timer);
				resolve();
			}
		});
	});
	assert.strictEqual(await new Promise<number>((resolve, reject) => {
		const req = http.request({
			port: httpPort,
			hostname: '127.0.0.1',
			method: 'GET',
			path: '/login',
		}, (res) => {
			res.setEncoding('utf8');
			res.once('end', () => {
				resolve(res.statusCode);
			});
			res.once('error', (err) => {
				reject(err);
			});
		});
		req.on('error', (err) => {
			reject(err);
		});
		req.end();
	}), 200, 'statuscode is 200');

	await proc.updateTimer(30000);

	proc.check();
});