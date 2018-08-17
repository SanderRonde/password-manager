import { isMongoConnected } from '../lib/db';
import { mochaTest } from '../lib/util';
import { assert } from 'chai';

export function enviromentTests() {
	describe('Enviroment', () => {
		it('has set up mongo', mochaTest(150, async () => {
			assert.isTrue(await isMongoConnected())
		}));
	});
}