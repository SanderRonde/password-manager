import { isMongoConnected } from '../lib/db';
import { assert } from 'chai';

export function enviromentTests() {
	describe('Enviroment', () => {
		it('has set up mongo', async () => {
			assert.isTrue(await isMongoConnected())
		});
	});
}