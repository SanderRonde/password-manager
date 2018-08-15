import { isMongoConnected } from '../lib/db';
import { assert } from 'chai';

console.log('Doing enviroment tests');
test('has set up mongo', async () => {
	console.log('inside enviroment test');
	assert.isTrue(await isMongoConnected())
});