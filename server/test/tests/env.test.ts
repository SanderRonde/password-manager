import { isMongoConnected } from '../lib/db';
import { test } from 'ava';

console.log('Doing enviroment tests');
test('has set up mongo', async t => {
	console.log('inside enviroment test');
	t.true(await isMongoConnected())
});