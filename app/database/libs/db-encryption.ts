import { encrypt, decrypt } from "../../lib/crypto";
import { CONSTANTS } from "../../lib/constants";
import { DatabaseEncrypted } from "../dbtypes";
import { Database } from "../database";

export class DatabaseEncryption {
	private _obfuscatedKey: string;
	private _keySpacing: number;
	private readonly _obfuscateChars = 
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

	constructor(private _parent: Database) {
		
	}

	private _obfuscateKey(key: string) {
		const firstPart = key.slice(0, 256);
		
		const obfuscateCharsLength = this._obfuscateChars.length;
		const spacing = this._keySpacing = Math.floor(256 / firstPart.length + 1);
		const finalKey: string[] = [];
		for (const char of firstPart) {
			for (let i = 0; i < spacing; i++) {
				const index = Math.floor(Math.random() * obfuscateCharsLength);
				finalKey.push(this._obfuscateChars[index]);
			}
			finalKey.push(char);
		}
		for (let i = finalKey.length; finalKey.length < 256; i++) {
			const index = Math.floor(Math.random() * obfuscateCharsLength);
			finalKey.push(this._obfuscateChars[index]);
		}
		return `${finalKey.join('')}${key.slice(256)}`;
	}

	private _deObfuscateKey() {
		const firstPart = this._obfuscatedKey.slice(0, 256);
		const originalKey: string[] = [];

		const totalSpacing = this._keySpacing + 1;
		let paddingRemaining = totalSpacing;
		for (const char of firstPart) {
			paddingRemaining--;
			if (paddingRemaining === 0) {
				originalKey.push(char);
				paddingRemaining = totalSpacing;
			}
		}
		return `${originalKey.join('')}${this._obfuscatedKey.slice(256)}`;
	}

	public dbEncrypt<T>(data: T, 
		key: string = this._deObfuscateKey()): DatabaseEncrypted<EncodedString<T>> {
			return encrypt(data, key, CONSTANTS.algorithm) as DatabaseEncrypted<EncodedString<T>>;
		}

	public dbDecrypt<T>(data: DatabaseEncrypted<EncodedString<T>>, 
		key: string = this._deObfuscateKey()): T {
			return decrypt(data, key);
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
}