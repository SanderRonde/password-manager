import { databaseEncryptionTest } from "./database-encryption.test";
import { cryptoTest } from "./crypto.test";

export function ImportsTest() {
	describe('Imports', () => {
		cryptoTest();
		databaseEncryptionTest();
	});
}