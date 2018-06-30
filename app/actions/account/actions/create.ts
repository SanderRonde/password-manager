import { Database, EncryptedAccount, COLLECTIONS } from "../../../database/database";
import { getConfirmedPassword } from "../../../lib/util";
import { hash } from "../../../lib/crypto";

export namespace CreateAccount {
	export async function createAccount(email: string, database: Database) {
		//Get a master password
		const password = await getConfirmedPassword('Please enter a master password');

		const record: EncryptedAccount = {
			email: database.dbEncrypt(email),
			pw: database.dbEncrypt(hash(password))
		}

		await database.insertOne(COLLECTIONS.USERS, record);
		console.log('Successfully created user!');
	}
}