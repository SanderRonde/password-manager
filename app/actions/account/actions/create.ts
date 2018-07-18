import { RESET_KEY_LENGTH, ENCRYPTION_ALGORITHM } from "../../../lib/constants";
import { getConfirmedPassword, genRandomString, exitWith } from "../../../lib/util";
import { Database, COLLECTIONS } from "../../../database/database";
import { EncryptedAccount } from "../../../database/db-types";
import { hash, pad, encrypt } from "../../../lib/crypto";

export namespace CreateAccount {
	export async function createAccount(email: string, database: Database) {
		if (!database) {
			return;
		}
		//Get a master password
		const password = await getConfirmedPassword('Please enter a master password');

		const resetKey = genRandomString(RESET_KEY_LENGTH);
		const record: EncryptedAccount = {
			email: email,
			pw: database.Crypto.dbEncrypt(hash(pad(password, 'masterpwverify'))),
			twofactor_enabled: database.Crypto.dbEncryptWithSalt(false),
			twofactor_secret: database.Crypto.dbEncryptWithSalt(null),
			reset_key: database.Crypto.dbEncrypt(encrypt({
				integrity: true as true,
				pw: password
			}, resetKey, ENCRYPTION_ALGORITHM)),
			reset_reset_keys: []
		}

		if (!await database.Manipulation.insertOne(COLLECTIONS.USERS, record)) {
			exitWith('Failed to create user record');
		}
		console.log('Successfully created user!');
		console.log('Your reset key is', resetKey);
		console.log('Do not lose this');
		await database.kill();
	}
}