import { readPassword, readConfirm, exitWith } from "../../../lib/util";
import { Database, COLLECTIONS } from "../../../database/database";
import { EncryptedAccount } from "../../../../../shared/types/db-types";
import { doTry } from "../../../../test/unit/lib/util";
import { pad, hash } from "../../../lib/crypto";
import { getDebug } from "../../../lib/debug";

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

	export async function deleteAccount(email: string, database: Database, debug: boolean) {
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

		const passwords = await database.Manipulation.findMany(COLLECTIONS.PASSWORDS, {
			user_id: id
		});

		const instances = await doTry(async () => {
			return (await database.collections.instances.find().toArray()).filter(({ user_id }) => {
				return user_id.toHexString() === id.toHexString();
			});
		});

		const account = await database.Manipulation.findOne(COLLECTIONS.USERS, {
			_id: id
		});

		if (instances === null) {
			exitWith('Failed to find instances, exiting');
			return;
		}

		if (passwords === null) {
			exitWith('Failed to find passwords, exiting');
			return;
		}

		if (account === null) {
			exitWith('Failed to find account, exiting');
			return;
		}

		console.log('Deleting instances...');

		const deletedInstances: number[] = [];
		if ((await Promise.all(instances.map((record, index) => {
			return new Promise(async (resolve) => {
				if (!await database.Manipulation.deleteOne(COLLECTIONS.INSTANCES, {
					_id: record._id
				})) {
					resolve(false);
				} else {
					deletedInstances.push(index);
					resolve(true);
				}
			});
		}))).filter(val => !val).length || getDebug(debug).FAIL_ON_INSTANCE) {
			console.log('Failed to delete an instance, undoing this operation');
			for (const index of deletedInstances) {
				if (!await database.Manipulation.insertOne(COLLECTIONS.INSTANCES, instances[index])) {
					console.log('Failed to re-insert instance with id', instances[index]._id.toHexString());
				}
			}

			await database.kill();
			exitWith('Done salvaging');
			return;
		}

		console.log('Deleting passwords...');
		if (passwords.length) {
			//Delete all passwords from the passwords collection
			if (!await database.Manipulation.deleteMany(COLLECTIONS.PASSWORDS, {
				user_id: id
			}) || getDebug(debug).FAIL_ON_PASSWORDS) {
				console.log('Failed to delete passwords, restoring instances');
				for (const instance of instances) {
					if (!await database.Manipulation.insertOne(COLLECTIONS.INSTANCES, instance)) {
						console.log('Failed to re-insert instance with id', instance._id.toHexString());
					}
				}

				for (const password of passwords) {
					if (!await database.Manipulation.findOne(COLLECTIONS.PASSWORDS, {
						_id: password._id
					})) {
						await database.Manipulation.insertOne(COLLECTIONS.PASSWORDS, password);
					}
				}

				await database.kill();
				exitWith('Done salvaging');
				return;
			}
		}

		console.log('Deleting user record...');
		//Delete the record from the users collection
		if (!await database.Manipulation.deleteOne(COLLECTIONS.USERS, {
			_id: id
		}) || getDebug(debug).FAIL_ON_ACCOUNT) {
			console.log('Failed to delete account, restoring instances and passwords');
			for (const instance of instances) {
				if (!await database.Manipulation.insertOne(COLLECTIONS.INSTANCES, instance)) {
					console.log('Failed to re-insert instance with id', instance._id.toHexString());
				}
			}

			for (const password of passwords) {
				if (!await database.Manipulation.insertOne(COLLECTIONS.PASSWORDS, password)) {
					console.log('Failed to re-insert password with id', password._id.toHexString());
				}
			}

			if (!await database.Manipulation.findOne(COLLECTIONS.USERS, {
				_id: id
			})) {
				//Re-insert it
				await database.Manipulation.insertOne(COLLECTIONS.USERS, account);
			}

			await database.kill();
			exitWith('Done salvaging');
			return;
		}

		console.log(`Done deleting user with email "${email}"`);
		await database.kill();
	}
}