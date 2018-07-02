import { Database, COLLECTIONS } from "../../../database/database";
import promptly = require('promptly');
import { hash } from "../../../lib/crypto";
import { EncryptedAccount } from "../../../database/dbtypes";

export namespace DeleteAccount {
	async function tryPasswordOnce(email: string, database: Database) {
		const password = await promptly.password('Please enter the account\'s password');

		const record: EncryptedAccount = {
			email: database.Crypto.dbEncrypt(email),
			pw: database.Crypto.dbEncrypt(hash(password))
		};

		const result = await database.Manipulation.findOne(COLLECTIONS.USERS, record);
		if (result) {
			return result;
		}
		return false;
	}

	async function getPassword(email: string, database: Database) {
		for (let i = 0; i < 3; i++) {
			console.log(`Attempt ${i + 1}/3`);
			const result = await tryPasswordOnce(email, database);
			if (result) {
				return result;
			}
		}
		return false;
	}

	export async function deleteAccount(email: string, database: Database) {
		const record = await getPassword(email, database);
		if (record === false) {
			console.log('Failed 3 times, exitting');
			process.exit(1);
			return;
		}

		console.log('Deleting user with email', email);
		await promptly.confirm('Are you sure?');
		await promptly.confirm('Are you very very sure?');

		const id = record._id;

		console.log('Deleting instances...');
		//Delete all instances from the instances collection
		await database.Manipulation.deleteMany(COLLECTIONS.INSTANCES, {
			user_id: id
		});

		console.log('Deleting passwords...');
		//Delete all passwords from the passwords collection
		await database.Manipulation.deleteMany(COLLECTIONS.PASSWORDS, {
			user_id: database.Crypto.dbEncrypt(id.toHexString())
		});

		console.log('Deleting user record...');
		//Delete the record from the users collection
		await database.Manipulation.deleteOne(COLLECTIONS.USERS, {
			_id: id
		});

		console.log('Done deleting user with email', email);
	}
}