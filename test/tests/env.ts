import { isMongoConnected } from '../lib/db';
import { test } from 'ava';

test.serial('has set up mongo', async t => {
	t.true(await isMongoConnected())
});