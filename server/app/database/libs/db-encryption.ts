import { DatabaseEncrypted, EncryptedPassword, DecryptedPassword, EncryptedInstance, DecryptedInstance, EncryptedAccount, DecryptedAccount, DatabaseEncryptedWithSalt, EncryptedAsset, DecryptedAsset } from "../../../../shared/types/db-types";
import { encrypt, decrypt, encryptWithSalt, decryptWithSalt } from "../../lib/crypto";
import { UnstringifyObjectIDs } from "../../../../shared/types/crypto";
import { ENCRYPTION_ALGORITHM } from "../../lib/constants";
import { Database } from "../database";
import { MockMongoDb } from "../mocks";

export class DatabaseEncryption {
	protected _obfuscatedKey: string | undefined;
	private _keyListeners: ((key: string) => void)[] = [];

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

	public getKey(): string;
	public getKey(callback?: (key: string) => void): null;
	public getKey(callback?: (key: string) => void): string|null {
		if (callback) {
			if (this._obfuscatedKey) {
				callback(this._deObfuscateKey());
			} else {
				this._keyListeners.push(callback);
			}
			return null;
		} else {
			return this._deObfuscateKey();
		}
	}

	public dbEncrypt<T>(data: T, 
		key: string = this._deObfuscateKey()): EncodedString<DatabaseEncrypted<EncodedString<T>>> {
			return encrypt(data, key, ENCRYPTION_ALGORITHM) as EncodedString<DatabaseEncrypted<EncodedString<T>>>;
		}

	public dbDecrypt<T>(data: EncodedString<DatabaseEncrypted<EncodedString<T>>>, 
		key: string = this._deObfuscateKey()): T {
			return decrypt(data, key) as T;
		}

	public dbEncryptWithSalt<T>(data: T,
		key: string = this._deObfuscateKey()): EncodedString<DatabaseEncryptedWithSalt<T>> {
			return encryptWithSalt(data, key, ENCRYPTION_ALGORITHM) as EncodedString<DatabaseEncryptedWithSalt<T>>;
		}

	public dbDecryptWithSalt<T>(data: EncodedString<DatabaseEncryptedWithSalt<T>>,
		key: string = this._deObfuscateKey()): T {
			return decryptWithSalt(data, key) as T;
		}

	public async hasEncryptionPassword() {
		const record = await (this._parent.mongoInstance as MockMongoDb).collection('meta').findOne({
			type: 'database'
		});
		return !!record;
	}

	public async canDecrypt(key: string) {
		const record = await (this._parent.mongoInstance as MockMongoDb).collection('meta').findOne({
			type: 'database'
		});
		if (!record) {
			//Uninitialized database, initialize now
			console.log('Empty database, creating with this key');
			await (this._parent.mongoInstance as MockMongoDb).collection('meta').insertOne({
				type: 'database',
				data: this.dbEncrypt('decrypted', key)
			});
			return true;
		}
		return this.dbDecrypt(record.data, key) === 'decrypted';
	}

	public setKey(key: string) {
		this._obfuscatedKey = this._obfuscateKey(key);
		this._keyListeners.forEach((listener) => {
			listener(this._deObfuscateKey());
		})
	}

	public dbDecryptPasswordRecord({ 
		user_id, encrypted, websites, twofactor_enabled, username
	}: EncryptedPassword|UnstringifyObjectIDs<EncryptedPassword>): DecryptedPassword {
		return {
			user_id: user_id,
			username: this.dbDecrypt(username),
			websites: websites.map(({ host, exact, favicon }) => {
				return {
					host: this.dbDecrypt(host),
					exact: this.dbDecrypt(exact),
					favicon: this.dbDecrypt(favicon)
				}
			}),
			encrypted: this.dbDecrypt(encrypted),
			twofactor_enabled: this.dbDecryptWithSalt(twofactor_enabled)
		}
	}

	public dbDecryptInstanceRecord({
		public_key, twofactor_enabled, user_id, server_private_key, expires
	}: EncryptedInstance|UnstringifyObjectIDs<EncryptedInstance>): DecryptedInstance {
		return {
			user_id: user_id,
			public_key: this.dbDecrypt(public_key),
			twofactor_enabled: this.dbDecryptWithSalt(twofactor_enabled),
			server_private_key: this.dbDecrypt(server_private_key),
			expires: this.dbDecrypt(expires)
		}
	}

	public dbDecryptAccountRecord({
		email, pw, twofactor_secret, twofactor_enabled, reset_key
	}: EncryptedAccount|UnstringifyObjectIDs<EncryptedAccount>): DecryptedAccount {
		return {
			email: email,
			pw: this.dbDecrypt(pw),
			twofactor_secret: this.dbDecryptWithSalt(twofactor_secret),
			twofactor_enabled: this.dbDecryptWithSalt(twofactor_enabled),
			reset_key: this.dbDecrypt(reset_key)
		}
	}

	public dbDecryptAssetRecord({
		by_user_id, default: defaultImg, host
	}: EncryptedAsset|UnstringifyObjectIDs<EncryptedAsset>): DecryptedAsset {
		return 	{
			by_user_id: this.dbDecrypt(by_user_id),
			default: this.dbDecrypt(defaultImg),
			host: host
		}
	}
}