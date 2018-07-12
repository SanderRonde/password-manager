import { Database, COLLECTIONS } from "../../../database/database";
import { EncryptedAccount } from "../../../database/db-types";
import { readPassword, readConfirm } from "../../../lib/util";
import { pad, hash } from "../../../lib/crypto";

export namespace DeleteAccount {
	async function tryPasswordOnce(email: string, database: Database) {
		const password = await readPassword('Please enter the account\'s password');

		const record: Partial<EncryptedAccount> = {
			email: email
		};

		const result = await database.Manipulation.findOne(COLLECTIONS.USERS, record);
		if (!result) {
			return false;
		}
		const hashed = database.Crypto.dbDecrypt(result.pw);
		if (hashed === hash(pad(password, 'masterpwverify'))) {
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
		if (!database) {
			return;
		}

		const record = await getPassword(email, database);
		if (record === false) {
			console.log('Failed 3 times, exiting');
			process.exit(1);
			return;
		}

		console.log(`Deleting user with email "${email}"`);
		await readConfirm('Are you sure?');
		await readConfirm('Are you very very sure?');

		const id = record._id;

		console.log('Deleting instances...');
		//Delete all instances from the instances collection
		await Promise.all((await database.collections.instances.find().toArray()).filter(({ user_id }) => {
			return database.Crypto.dbDecrypt(user_id) === id.toHexString();
		}).map(async (record) => {
			await database.Manipulation.deleteOne(COLLECTIONS.INSTANCES, {
				_id: record._id
			});
		}));

		if ((await database.Manipulation.findMany(COLLECTIONS.PASSWORDS, {
			user_id: id
		})).length) {
			//Delete all passwords from the passwords collection
			await database.Manipulation.deleteMany(COLLECTIONS.PASSWORDS, {
				user_id: id
			});
		}

		console.log('Deleting user record...');
		//Delete the record from the users collection
		await database.Manipulation.deleteOne(COLLECTIONS.USERS, {
			_id: id
		});

		console.log(`Done deleting user with email "${email}"`);
		await database.kill();
	}
}