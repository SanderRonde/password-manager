import { TEST_DATABASE } from '../../app/lib/constants';
import mongo = require('mongodb');

export async function clearDB() {
	const instance = await mongo.connect(TEST_DATABASE);
	await instance.dropDatabase();
}