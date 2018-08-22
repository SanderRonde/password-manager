import { captureURIs, createServer, genUserAndDb, doServerPostRequest, UserAndDbData, doesNotThrow, genURL, getLoginToken } from '../../lib/util';
const parallel = require('mocha.parallel') as (name: string, fn: (this: Mocha.Context) => any) => void;
import { APIReturns, API_ERRS } from '../../../app/../../../shared/types/api';
import { encryptWithPublicKey, pad, hash } from '../../../../app/lib/crypto';
import { wait, genRandomString } from '../../../../app/lib/util';
import { APIToken } from '../../../../../shared/types/crypto';
import { assert } from 'chai';
import * as http from 'http'


async function doInstanceCreateRequest(config: UserAndDbData) {
	const challenge = genRandomString(25);
	return await doServerPostRequest({ 
		port: config.http,
		publicKey: config.server_public_key
	}, '/api/instance/login', {
		instance_id: config.instance_id.toHexString(),
		challenge: encryptWithPublicKey(challenge, config.server_public_key)
	}, {
		password_hash: hash(pad(config.userpw, 'masterpwverify'))
	});
}

async function doAPIRequest(token: APIToken, config: UserAndDbData) {
	return await doServerPostRequest({ 
		port: config.http, 
		publicKey: config.server_public_key
	}, '/api/password/querymeta', {
		instance_id: config.instance_id.toHexString(),
	}, {
		token: token,
		count: config.count++,
		url: genURL()
	});
}

async function doFailingInstanceCreateRequest(config: UserAndDbData) {
	const challenge = genRandomString(25);
	return await doServerPostRequest({ 
		port: config.http,
		publicKey: config.server_public_key
	}, '/api/instance/login', {
		instance_id: config.instance_id.toHexString(),
		challenge: encryptWithPublicKey(challenge, config.server_public_key),
	}, {
		password_hash: hash(pad('wrongpassword', 'masterpwverify'))
	});
}

function assertSucceedsAndIsNotRatelimited({
	response, responseText
}: {
	response: http.IncomingMessage;
	responseText: EncodedString<APIReturns[keyof APIReturns]>
}, message: string = 'is not TOO_MANY_REQUESTS') {
	assert.notStrictEqual(response.statusCode, 429, message);
	assert.strictEqual(response.statusCode, 200, 'has success status code');
	const parsed = doesNotThrow(() => {
		return JSON.parse(responseText);
	}, 'response can be JSON parsed');
	assert.isTrue(parsed.success, 'request was successful');
	return {
		response, responseText
	}
}

function assertIsRateLimited({
	response, responseText
}: {
	response: http.IncomingMessage;
	responseText: EncodedString<APIReturns[keyof APIReturns]>
}, message: string = 'is TOO_MANY_REQUESTS') {
	assert.strictEqual(response.statusCode, 429, message);
	const parsed = doesNotThrow(() => {
		return JSON.parse(responseText);
	}, 'response can be JSON parsed');
	assert.isFalse(parsed.success, 'request was successful');
	if (parsed.success === true) return;
	assert.strictEqual(parsed.ERR, API_ERRS.TOO_MANY_REQUESTS, 
		'responded with TOO_MANY_REQUESTS');
	return {
		response, responseText
	}
}

function assertFailsAndIsNotRatelimited({
	response, responseText
}: {
	response: http.IncomingMessage;
	responseText: EncodedString<APIReturns[keyof APIReturns]>
}, message: string = 'is not TOO_MANY_REQUESTS') {
	assert.notStrictEqual(response.statusCode, 429, message);
	assert.strictEqual(response.statusCode, 200, 'has success status code');
	const parsed = doesNotThrow(() => {
		return JSON.parse(responseText);
	}, 'response can be JSON parsed');
	assert.isFalse(parsed.success, 'request failed');
	return {
		response, responseText
	}
}

async function checkTiming(fn: () => Promise<void>) {
	const before = Date.now();
	await fn();
	return Date.now() - before;
}

async function assertMaxDuration(fn: () => Promise<void>,
	minDuration: number, maxDuration: number, message: string = `does not take less than ${
		minDuration} and more than ${maxDuration}`) {
			const time = await checkTiming(fn);
			assert.isTrue(time > minDuration, message);
			assert.isTrue(time < maxDuration, message);
		}

function getSpedupTime(time: number) {
	return time / 4;
}

export function rateLimitTest() {
	parallel('Ratelimit', function() {
		const uris = captureURIs();
		it('instance create ratelimiter ratelimits on quick requests', async () => {2
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer({...config, ...{
				enableRateLimit: true 
			}}, {
				SPEED_UP_TIME_BY_4: true
			});
			uris.push(config.uri);
			
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			
			assertIsRateLimited(await doInstanceCreateRequest(config),
				'ratelimits after 5 requests');
			assertIsRateLimited(await doInstanceCreateRequest(config),
				'later requests are also ratelimited');
			assertIsRateLimited(await doInstanceCreateRequest(config),
				'later requests are also ratelimited');
			assertIsRateLimited(await doInstanceCreateRequest(config),
				'later requests are also ratelimited');

			await wait(getSpedupTime(10000));

			assertIsRateLimited(await doInstanceCreateRequest(config),
				'waiting 10 seconds does not clear the ratelimit');
			
			await wait(getSpedupTime(50000));

			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config),
				'ratelimit is lifted after 60 seconds');

			server.kill();
		});
		it('instance create ratelimiter ratelimits on slow requests', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer({...config, enableRateLimit: true }, {
				SPEED_UP_TIME_BY_4: true
			});
			uris.push(config.uri);
			
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			await wait(getSpedupTime(10000));
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			await wait(getSpedupTime(10000));
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			await wait(getSpedupTime(10000));
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			await wait(getSpedupTime(10000));
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			await wait(getSpedupTime(10000));

			assertIsRateLimited(await doInstanceCreateRequest(config),
				'ratelimits after 5 requests');

			await wait(getSpedupTime(20000));

			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config),
				'waiting 20 seconds clears the ratelimit');

			server.kill();
		});
		it('api use ratelimiter works', async function() {
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer({...config, enableRateLimit: true }, {
				SPEED_UP_TIME_BY_4: true
			});
			uris.push(config.uri);

			const token = (await getLoginToken(config))!;

			const startTime = Date.now();
			for (let i = 0; i < 10; i++) {
				await assertMaxDuration(async () => {
					assertSucceedsAndIsNotRatelimited(await doAPIRequest(token, config));
				}, 0, 250, 'first 10 requests are still fast');
			}
			for (let i = 0; i < 10 && Date.now() - startTime < getSpedupTime(20000); i++) {
				await assertMaxDuration(async () => {
					assertSucceedsAndIsNotRatelimited(await doAPIRequest(token, config));
				}, 800, Infinity, 'later requests are ratelimited');
			}	

			server.kill();
		});
		it('succeeding requests are not ratelimited by the bruteforce ratelimiter', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer({...config, enableRateLimit: true }, {
				SPEED_UP_TIME_BY_4: true
			});
			uris.push(config.uri);
			
			
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			await assertMaxDuration(async () => {
				assertSucceedsAndIsNotRatelimited(await doInstanceCreateRequest(config));
			}, 0, 250, 'succeeding requests are not ratelimited');
			
			server.kill();
		});
		it('failings requests are ratelimited by the bruteforce limiter', async () => {
			const config = await genUserAndDb({
				account_twofactor_enabled: false
			});
			const server = await createServer({...config, enableRateLimit: true }, {
				SPEED_UP_TIME_BY_4: true
			});
			uris.push(config.uri);
			

			assertFailsAndIsNotRatelimited(await doFailingInstanceCreateRequest(config));
			assertFailsAndIsNotRatelimited(await doFailingInstanceCreateRequest(config));
			assertFailsAndIsNotRatelimited(await doFailingInstanceCreateRequest(config));
			assertFailsAndIsNotRatelimited(await doFailingInstanceCreateRequest(config));
			assertFailsAndIsNotRatelimited(await doFailingInstanceCreateRequest(config));

			assertIsRateLimited(await doFailingInstanceCreateRequest(config),
				'requests are rate limited after 4 failing requests');
			assertIsRateLimited(await doFailingInstanceCreateRequest(config),
				'further requests are ratelimited');

			await wait(getSpedupTime(10000));

			assertIsRateLimited(await doFailingInstanceCreateRequest(config),
				'requests are still ratelimited 10 seconds later');

			await wait(getSpedupTime(60000));

			assertFailsAndIsNotRatelimited(await doFailingInstanceCreateRequest(config),
				'rate limiting is lifted after 60 seconds');
			
			server.kill();
		});
	});
}