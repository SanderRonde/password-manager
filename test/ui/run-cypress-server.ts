import { MAIN_SERVER_PORT, DEFAULT_EMAIL, DEFAULT_PW } from "./lib/ui-test-const";
import { getDatabase, COLLECTIONS } from "../../server/app/database/database";
import { genTempDatabase } from "../../server/test/unit/lib/util";
import { hash, pad, encrypt } from "../../server/app/lib/crypto";
import { EncryptedAccount } from "../../shared/types/db-types";
import { Server } from '../../server/app/actions/server/server';

export async function runCypressServer() {
	const uri = await genTempDatabase()
	const db = await getDatabase(uri,
		'somepw', true, false);
	await Server.run(db, {
		http: MAIN_SERVER_PORT,
		https: 443,
		database: uri,
		config: '',
		dbpath: uri,
		ratelimit: true,
		databaseless: true,
		debug: false,
		development: false,
		httpsOnly: false,
		isConfig: true
	});
	const account: EncryptedAccount = {
		email: DEFAULT_EMAIL,
		pw: db.Crypto.dbEncrypt(hash(pad(DEFAULT_PW, 'masterpwverify'))),
		twofactor_enabled: db.Crypto.dbEncryptWithSalt(false),
		twofactor_secret: db.Crypto.dbEncryptWithSalt(null),
		reset_key: db.Crypto.dbEncrypt(encrypt({
			integrity: true as true,
			pw: DEFAULT_PW
		}, 'somestring', 'aes-256-ctr'))
	}
	await db.Manipulation.insertOne(COLLECTIONS.USERS, account);
}

if (require.main === module) {
	runCypressServer();
}