import { Database, COLLECTIONS } from "../../../database/database";
import { getConfirmedPassword } from "../../../lib/util";
import { hash } from "../../../lib/crypto";
import { EncryptedAccount } from "../../../database/dbtypes";

export namespace CreateAccount {
	export async function createAccount(email: string, database: Database) {
		//Get a master password
		const password = await getConfirmedPassword('Please enter a master password');

		const record: EncryptedAccount = {
			email: database.Crypto.dbEncrypt(email),
			pw: database.Crypto.dbEncrypt(hash(password))
		}

		await database.Manipulation.insertOne(COLLECTIONS.USERS, record);
		console.log('Successfully created user!');
	}
}