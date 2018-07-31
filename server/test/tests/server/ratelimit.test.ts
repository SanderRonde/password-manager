import { captureURIs, createServer, genUserAndDb, doServerPostRequest, UserAndDbData, doesNotThrow, genURL, getLoginToken } from '../../lib/util';
import { APIToken } from '../../../app/actions/server/webserver/server/modules/auth';
import { encryptWithPublicKey, pad, hash } from '../../../app/lib/crypto';
import { wait, genRandomString } from '../../../app/lib/util';
import { APIReturns, API_ERRS } from '../../../app/api';
import { test, GenericTestContext, Context } from 'ava';
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

function assertSucceedsAndIsNotRatelimited(t: GenericTestContext<Context<any>>, {
	response, responseText
}: {
	response: http.IncomingMessage;
	responseText: EncodedString<APIReturns[keyof APIReturns]>
}, message: string = 'is not TOO_MANY_REQUESTS') {
	t.not(response.statusCode, 429, message);
	t.is(response.statusCode, 200, 'has success status code');
	const parsed = doesNotThrow(t, () => {
		return JSON.parse(responseText);
	}, 'response can be JSON parsed');
	t.true(parsed.success, 'request was successful');
	return {
		response, responseText
	}
}

function assertIsRateLimited(t: GenericTestContext<Context<any>>, {
	response, responseText
}: {
	response: http.IncomingMessage;
	responseText: EncodedString<APIReturns[keyof APIReturns]>
}, message: string = 'is TOO_MANY_REQUESTS') {
	t.is(response.statusCode, 429, message);
	const parsed = doesNotThrow(t, () => {
		return JSON.parse(responseText);
	}, 'response can be JSON parsed');
	t.false(parsed.success, 'request was successful');
	if (parsed.success === true) return;
	t.is(parsed.ERR, API_ERRS.TOO_MANY_REQUESTS, 
		'responded with TOO_MANY_REQUESTS');
	return {
		response, responseText
	}
}

function assertFailsAndIsNotRatelimited(t: GenericTestContext<Context<any>>, {
	response, responseText
}: {
	response: http.IncomingMessage;
	responseText: EncodedString<APIReturns[keyof APIReturns]>
}, message: string = 'is not TOO_MANY_REQUESTS') {
	t.not(response.statusCode, 429, message);
	t.is(response.statusCode, 200, 'has success status code');
	const parsed = doesNotThrow(t, () => {
		return JSON.parse(responseText);
	}, 'response can be JSON parsed');
	t.false(parsed.success, 'request failed');
	return {
		response, responseText
	}
}

async function checkTiming(fn: () => Promise<void>) {
	const before = Date.now();
	await fn();
	return Date.now() - before;
}

async function assertMaxDuration(t: GenericTestContext<Context<any>>, fn: () => Promise<void>,
	minDuration: number, maxDuration: number, message: string = `does not take less than ${
		minDuration} and more than ${maxDuration}`) {
			const time = await checkTiming(fn);
			t.true(time > minDuration, message);
			t.true(time < maxDuration, message);
		}

function getSpedupTime(time: number) {
	return time / 4;
}

const uris = captureURIs(test);
test('instance create ratelimiter ratelimits on quick requests', async t => {2
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer({...config, ...{
		enableRateLimit: true 
	}}, {
		SPEED_UP_TIME_BY_4: true
	});
	uris.push(config.uri);
	
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	
	assertIsRateLimited(t, await doInstanceCreateRequest(config),
		'ratelimits after 5 requests');
	assertIsRateLimited(t, await doInstanceCreateRequest(config),
		'later requests are also ratelimited');
	assertIsRateLimited(t, await doInstanceCreateRequest(config),
		'later requests are also ratelimited');
	assertIsRateLimited(t, await doInstanceCreateRequest(config),
		'later requests are also ratelimited');

	await wait(getSpedupTime(10000));

	assertIsRateLimited(t, await doInstanceCreateRequest(config),
		'waiting 10 seconds does not clear the ratelimit');
	
	await wait(getSpedupTime(50000));

	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config),
		'ratelimit is lifted after 60 seconds');

	server.kill();
});
test('instance create ratelimiter ratelimits on slow requests', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer({...config, enableRateLimit: true }, {
		SPEED_UP_TIME_BY_4: true
	});
	uris.push(config.uri);
	
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	await wait(getSpedupTime(10000));
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	await wait(getSpedupTime(10000));
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	await wait(getSpedupTime(10000));
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	await wait(getSpedupTime(10000));
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	await wait(getSpedupTime(10000));

	assertIsRateLimited(t, await doInstanceCreateRequest(config),
		'ratelimits after 5 requests');

	await wait(getSpedupTime(20000));

	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config),
		'waiting 20 seconds clears the ratelimit');

	server.kill();
});
test('api use ratelimiter works', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer({...config, enableRateLimit: true }, {
		SPEED_UP_TIME_BY_4: true
	});
	uris.push(config.uri);

	const token = (await getLoginToken(t, config))!;

	const startTime = Date.now();
	for (let i = 0; i < 10; i++) {
		await assertMaxDuration(t, async () => {
			assertSucceedsAndIsNotRatelimited(t, await doAPIRequest(token, config));
		}, 0, 250, 'first 10 requests are still fast');
	}
	for (let i = 0; i < 10 && Date.now() - startTime < getSpedupTime(20000); i++) {
		await assertMaxDuration(t, async () => {
			assertSucceedsAndIsNotRatelimited(t, await doAPIRequest(token, config));
		}, 800, Infinity, 'later requests are ratelimited');
	}	

	server.kill();
});
test('succeeding requests are not ratelimited by the bruteforce ratelimiter', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer({...config, enableRateLimit: true }, {
		SPEED_UP_TIME_BY_4: true
	});
	uris.push(config.uri);
	
	
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	await assertMaxDuration(t, async () => {
		assertSucceedsAndIsNotRatelimited(t, await doInstanceCreateRequest(config));
	}, 0, 250, 'succeeding requests are not ratelimited');
	
	server.kill();
});
test('failings requests are ratelimited by the bruteforce limiter', async t => {
	const config = await genUserAndDb(t, {
		account_twofactor_enabled: false
	});
	const server = await createServer({...config, enableRateLimit: true }, {
		SPEED_UP_TIME_BY_4: true
	});
	uris.push(config.uri);
	

	assertFailsAndIsNotRatelimited(t, await doFailingInstanceCreateRequest(config));
	assertFailsAndIsNotRatelimited(t, await doFailingInstanceCreateRequest(config));
	assertFailsAndIsNotRatelimited(t, await doFailingInstanceCreateRequest(config));
	assertFailsAndIsNotRatelimited(t, await doFailingInstanceCreateRequest(config));
	assertFailsAndIsNotRatelimited(t, await doFailingInstanceCreateRequest(config));

	assertIsRateLimited(t, await doFailingInstanceCreateRequest(config),
		'requests are rate limited after 4 failing requests');
	assertIsRateLimited(t, await doFailingInstanceCreateRequest(config),
		'further requests are ratelimited');

	await wait(getSpedupTime(10000));

	assertIsRateLimited(t, await doFailingInstanceCreateRequest(config),
		'requests are still ratelimited 10 seconds later');

	await wait(getSpedupTime(60000));

	assertFailsAndIsNotRatelimited(t, await doFailingInstanceCreateRequest(config),
		'rate limiting is lifted after 60 seconds');
	
	server.kill();
});