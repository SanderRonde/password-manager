import { Database, COLLECTIONS } from "../../../database/database";
import promptly = require('promptly');
import { hash } from "../../../lib/crypto";
import { EncryptedAccount } from "../../../database/db-types";
import { Log } from "../../../main";

export namespace DeleteAccount {
	async function tryPasswordOnce(email: string, database: Database) {
		const password = await promptly.password('Please enter the account\'s password');

		const record: Partial<EncryptedAccount> = {
			email: database.Crypto.dbEncrypt(email),
			pw: database.Crypto.dbEncrypt(hash(password))
		};

		const result = await database.Manipulation.findOne(COLLECTIONS.USERS, record);
		if (result) {
			return result;
		}
		return false;
	}

	async function getPassword(log: Log, email: string, database: Database) {
		for (let i = 0; i < 3; i++) {
			log.write(`Attempt ${i + 1}/3`);
			const result = await tryPasswordOnce(email, database);
			if (result) {
				return result;
			}
		}
		return false;
	}

	export async function deleteAccount(log: Log, email: string, database: Database) {
		const record = await getPassword(log, email, database);
		if (record === false) {
			log.write('Failed 3 times, exitting');
			process.exit(1);
			return;
		}

		log.write('Deleting user with email', email);
		await promptly.confirm('Are you sure?');
		await promptly.confirm('Are you very very sure?');

		const id = record._id;

		log.write('Deleting instances...');
		//Delete all instances from the instances collection
		await database.Manipulation.deleteMany(COLLECTIONS.INSTANCES, {
			user_id: database.Crypto.dbEncrypt(id.toHexString())
		});

		log.write('Deleting passwords...');
		//Delete all passwords from the passwords collection
		await database.Manipulation.deleteMany(COLLECTIONS.PASSWORDS, {
			user_id: database.Crypto.dbEncrypt(id.toHexString())
		});

		log.write('Deleting user record...');
		//Delete the record from the users collection
		await database.Manipulation.deleteOne(COLLECTIONS.USERS, {
			_id: id
		});

		log.write('Done deleting user with email', email);
	}
}