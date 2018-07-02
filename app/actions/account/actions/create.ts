import { Database, COLLECTIONS } from "../../../database/database";
import { EncryptedAccount } from "../../../database/dbtypes";
import { getConfirmedPassword } from "../../../lib/util";
import { hash, pad } from "../../../lib/crypto";

export namespace CreateAccount {
	export async function createAccount(email: string, database: Database) {
		//Get a master password
		const password = await getConfirmedPassword('Please enter a master password');

		const record: EncryptedAccount = {
			email: database.Crypto.dbEncrypt(email),
			pw: database.Crypto.dbEncrypt(hash(pad(password, 'masterpwverify')))
		}

		await database.Manipulation.insertOne(COLLECTIONS.USERS, record);
		console.log('Successfully created user!');
	}
}