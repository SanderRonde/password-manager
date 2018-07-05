import mongo = require('mongodb');
import { CONSTANTS } from '../../app/lib/constants';

export async function clearDB() {
	const instance = await mongo.connect(CONSTANTS.testDatabase);
	await instance.dropDatabase();
}