import { getConfirmedPassword, genRandomString } from "../../../lib/util";
import { Database, COLLECTIONS } from "../../../database/database";
import { EncryptedAccount } from "../../../database/db-types";
import { CONSTANTS } from "../../../lib/constants";
import { hash, pad, encrypt } from "../../../lib/crypto";
import { Log } from "../../../main";

export namespace CreateAccount {
	export async function createAccount(log: Log, email: string, database: Database) {
		//Get a master password
		const password = await getConfirmedPassword(log, 'Please enter a master password');

		const resetKey = genRandomString(CONSTANTS.resetKeyLength);
		const record: EncryptedAccount = {
			email: database.Crypto.dbEncrypt(email),
			pw: database.Crypto.dbEncrypt(hash(pad(password, 'masterpwverify'))),
			twofactor_enabled: database.Crypto.dbEncryptWithSalt(false),
			twofactor_secret: database.Crypto.dbEncrypt(null),
			reset_key: database.Crypto.dbEncrypt(encrypt({
				integrity: true as true,
				pw: password
			}, resetKey, CONSTANTS.encryptionAlgorithm)),
			reset_reset_keys: []
		}

		await database.Manipulation.insertOne(COLLECTIONS.USERS, record);
		log.write('Successfully created user!');
		log.write('Your reset key is', resetKey);
		log.write('Do not lose this');
	}
}