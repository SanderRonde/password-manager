import { captureURIs, genUserAndDb, createServer, doAPIRequest } from '../../../lib/util';
import { DEFAULT_EMAIL } from '../../../lib/consts';
import { test } from 'ava';
import { hash, pad } from '../../../../app/lib/crypto';

const uris = captureURIs(test);
test.skip('instance can be created', async t => {
	const config = await genUserAndDb(t);
	const server = await createServer(config);
	const { http, userpw, uri } = config;
	uris.push(uri);

	JSON.parse(await doAPIRequest(http, '/api/instance/register', {
		email: DEFAULT_EMAIL,
		password: hash(pad(userpw, 'masterpwverify')),
		//TODO: generate public key
		public_key: ''
	}));


	server.kill();
});