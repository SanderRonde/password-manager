import { DatabaseEncrypted, EncryptedPassword, DecryptedPassword, EncryptedInstance, DecryptedInstance, EncryptedAccount, DecryptedAccount, DatabaseEncryptedWithSalt } from "../db-types";
import { encrypt, decrypt, encryptWithSalt, decryptWithSalt } from "../../lib/crypto";
import { ENCRYPTION_ALGORITHM } from "../../lib/constants";
import { UnstringifyObjectIDs } from "./db-manipulation";
import { Database } from "../database";

export class DatabaseEncryption {
	protected _obfuscatedKey: string | undefined;

	constructor(private _parent: Database) {
		
	}

	protected _obfuscateKey(key: string) {
		return Buffer
			.from(key.toString(), 'binary')
			.toString('base64');
	}

	protected _deObfuscateKey() {
		return Buffer.from(this._obfuscatedKey!, 'base64')
			.toString('binary');
	}

	public getKey() {
		return this._deObfuscateKey();
	}

	public dbEncrypt<T>(data: T, 
		key: string = this._deObfuscateKey()): DatabaseEncrypted<EncodedString<T>> {
			return encrypt(data, key, ENCRYPTION_ALGORITHM) as DatabaseEncrypted<EncodedString<T>>;
		}

	public dbDecrypt<T>(data: DatabaseEncrypted<EncodedString<T>>, 
		key: string = this._deObfuscateKey()): T {
			return decrypt(data, key) as T;
		}

	public dbEncryptWithSalt<T>(data: T,
		key: string = this._deObfuscateKey()): DatabaseEncryptedWithSalt<T> {
			return encryptWithSalt(data, key, ENCRYPTION_ALGORITHM) as DatabaseEncryptedWithSalt<T>;
		}

	public dbDecryptWithSalt<T>(data: DatabaseEncryptedWithSalt<T>,
		key: string = this._deObfuscateKey()): T {
			return decryptWithSalt(data, key) as T;
		}

	public async hasEncryptionPassword() {
		const record = await this._parent.mongoInstance.collection('meta').findOne({
			type: 'database'
		});
		return !!record;
	}

	public async canDecrypt(key: string) {
		const record = await this._parent.mongoInstance.collection('meta').findOne({
			type: 'database'
		});
		if (!record) {
			//Uninitialized database, initialize now
			console.log('Empty database, creating with this key');
			await this._parent.mongoInstance.collection('meta').insertOne({
				type: 'database',
				data: this.dbEncrypt('decrypted', key)
			});
			return true;
		}
		return this.dbDecrypt(record.data, key) === 'decrypted';
	}

	public setKey(key: string) {
		this._obfuscatedKey = this._obfuscateKey(key);
	}

	public dbDecryptPasswordRecord({ 
		user_id, encrypted, websites , twofactor_enabled
	}: EncryptedPassword|UnstringifyObjectIDs<EncryptedPassword>): DecryptedPassword {
		return {
			user_id: user_id,
			websites: websites.map(({ host, exact }) => {
				return {
					host: this.dbDecrypt(host),
					exact: this.dbDecrypt(exact)
				}
			}),
			encrypted: this.dbDecrypt(encrypted),
			twofactor_enabled: this.dbDecryptWithSalt(twofactor_enabled)
		}
	}

	public dbDecryptInstanceRecord({
		public_key, twofactor_enabled, user_id, server_private_key
	}: EncryptedInstance|UnstringifyObjectIDs<EncryptedInstance>): DecryptedInstance {
		return {
			user_id: this.dbDecrypt(user_id),
			public_key: this.dbDecrypt(public_key),
			twofactor_enabled: this.dbDecryptWithSalt(twofactor_enabled),
			server_private_key: this.dbDecrypt(server_private_key)
		}
	}

	public dbDecryptAccountRecord({
		email, pw, twofactor_secret, twofactor_enabled, reset_key, reset_reset_keys
	}: EncryptedAccount|UnstringifyObjectIDs<EncryptedAccount>): DecryptedAccount {
		return {
			email: email,
			pw: this.dbDecrypt(pw),
			twofactor_secret: this.dbDecryptWithSalt(twofactor_secret),
			twofactor_enabled: this.dbDecryptWithSalt(twofactor_enabled),
			reset_key: this.dbDecrypt(reset_key),
			reset_reset_keys: reset_reset_keys.map((key) => {
				return this.dbDecrypt(key);
			})
		}
	}
}