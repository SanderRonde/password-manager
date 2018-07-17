import { EncryptedInstance, StringifiedObjectId, MasterPassword } from "../../../../../../../database/db-types";
import { ENCRYPTION_ALGORITHM, RESET_KEY_LENGTH } from "../../../../../../../lib/constants";
import { decrypt, encrypt, hash, pad, ERRS } from "../../../../../../../lib/crypto";
import { genRandomString, sendEmail } from "../../../../../../../lib/util";
import { COLLECTIONS } from "../../../../../../../database/database";
import { ResponseCaptured } from "../../../modules/ratelimit";
import { API_ERRS } from "../../../../../../../api";
import { Webserver } from "../../../webserver";
import express = require('express');

export class RoutesAPIAccount {
	constructor(public server: Webserver) { }

	public reset(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			reset_key: string;
			email: string
			newmasterpassword: MasterPassword;	
		}>([
			'email', 'reset_key', 'newmasterpassword'
		], [], async (req, res, { email, reset_key, newmasterpassword }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'email',
				type: 'string'
			}, {
				val: 'reset_key',
				type: 'string'
			}, {
				val: 'newmasterpassword',
				type: 'string'
			}])) return;

			const encryptedAccount = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					email: email
				});
			if (encryptedAccount === null) {
				res.status(200);
				res.json({
					success: false,
					//Failed to parse JSON, incorrect key
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}
			const { reset_key: accountResetKey, reset_reset_keys } = 
				this.server.database.Crypto.dbDecryptAccountRecord(encryptedAccount);

			let decrypted: {
				integrity: true;
				pw: string;
			};
			try {
				const initialDecrypt = decrypt(accountResetKey, reset_key);
				if (initialDecrypt === ERRS.INVALID_DECRYPT) {
					throw new Error('invalid decrypt');
				}
				decrypted = initialDecrypt;
			} catch(e) {
				res.status(200);
				res.json({
					success: false,
					//Failed to parse JSON, incorrect key
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}
			if (decrypted.integrity !== true) {
				res.status(200);
				res.json({
					success: false,
					//Failed to parse JSON, incorrect key
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			//Correct key, decrypt everything
			const { pw: decryptedMasterPassword } = decrypted;
			const passwords = await this.server.database.Manipulation.findMany(
				COLLECTIONS.PASSWORDS, {
					user_id: encryptedAccount._id.toHexString()
				});
			const newEncryptionHash = hash(pad(newmasterpassword, 'masterpwdecrypt'));
			await Promise.all(passwords.map((encryptedPassword) => {
				return new Promise(async (resolve) => {
					const encryptedSection = this.server.database.Crypto.dbDecrypt(
						encryptedPassword.encrypted);
					const decryptedEncrypedSection = decrypt(encryptedSection, 
						decryptedMasterPassword)
					
					if (decryptedEncrypedSection === ERRS.INVALID_DECRYPT) {
						resolve();
						return;
					}
					
					//Re-encrypt it
					const reEncrypted = encrypt(decryptedEncrypedSection, newEncryptionHash,
						ENCRYPTION_ALGORITHM);				

					await this.server.database.Manipulation.findAndUpdateOne(
						COLLECTIONS.PASSWORDS, {
							_id: encryptedPassword._id
						}, {
							encrypted: this.server.database.Crypto.dbEncrypt(reEncrypted),
							twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(false)
						});
					resolve()
				});
			}));

			//Disable 2FA for all instances
			const instances = await this.server.database.Manipulation.findMany(
				COLLECTIONS.INSTANCES, {
					user_id: encryptedAccount._id
				});

			await Promise.all(instances.map((instance) => {
				return new Promise(async (resolve) => {
					await this.server.database.Manipulation.findAndUpdateOne(
						COLLECTIONS.INSTANCES, {
							_id: instance._id
						}, {
							twofactor_enabled: 
								this.server.database.Crypto.dbEncryptWithSalt(false)
						});
					resolve();
				});
			}));

			//Change password verification key and master password
			const newResetKey = genRandomString(RESET_KEY_LENGTH);

			await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.USERS, {
				_id: encryptedAccount._id
			}, {
				pw: this.server.database.Crypto.dbEncrypt(
					hash(pad(newmasterpassword, 'masterpwverify'))),
				reset_key: this.server.database.Crypto.dbEncrypt(encrypt({
						integrity: true as true, // ?
						pw: newmasterpassword
					}, newResetKey, ENCRYPTION_ALGORITHM)
				),
				reset_reset_keys: [...reset_reset_keys, encrypt(
					encrypt({
						integrity: true as true
					}, reset_key, ENCRYPTION_ALGORITHM), 
						decryptedMasterPassword, ENCRYPTION_ALGORITHM)].map((key) => {
							return this.server.database.Crypto.dbEncrypt(key);
						})
			});

			res.status(200);
			res.json({
				success: true,
				data: {
					new_reset_key: newResetKey
				}
			});

			sendEmail(this.server.config, email, 'Account reset',
				'Your master password has been changed and so has your reset key.' + 
				' If you know the previous reset key, go to your favorite' + 
				' client and hit the "undo reset" button.');
		})(req, res, next);
	}

	public undoreset(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			reset_key: string;
			email: string
			master_password: MasterPassword;
			newmasterpassword: MasterPassword;	
		}>([
			'email', 'reset_key', 'newmasterpassword', 'master_password'
		], [], async (req, res, { email, reset_key, newmasterpassword, master_password }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'email',
				type: 'string'
			}, {
				val: 'reset_key',
				type: 'string'
			}, {
				val: 'newmasterpassword',
				type: 'string'
			}])) return;

			const encryptedAccount = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					email: email
				});
			if (encryptedAccount === null) {
				res.status(200);
				res.json({
					success: false,
					//Failed to parse JSON, incorrect key
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}
			const { reset_reset_keys } = 
				this.server.database.Crypto.dbDecryptAccountRecord(encryptedAccount);

			let decrypted: {
				integrity: true;
			}|undefined;
			let matchIndex: number = -1;
			for (let i = 0; i < reset_reset_keys.length; i++) {
				const reset_reset_key = reset_reset_keys[i];
				try {
					const initialDecrypt = decrypt(reset_reset_key, reset_key);
					if (initialDecrypt === ERRS.INVALID_DECRYPT) {
						throw new Error('Invalid decrypt');
					}
					const secondDecrypt = decrypt(initialDecrypt,
						master_password);
					if (secondDecrypt === ERRS.INVALID_DECRYPT) {
						throw new Error('Invalid decrypt');
					}
					decrypted = secondDecrypt;
				} catch(e) { continue; }
				if (decrypted && decrypted.integrity === true) {
					matchIndex = i;
					break;
				}
			}
			if (decrypted === undefined || !decrypted.integrity) {
				res.status(200);
				res.json({
					success: false,
					//Failed to parse JSON, incorrect key
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			const decryptedMasterPassword = master_password;
			const passwords = await this.server.database.Manipulation.findMany(
				COLLECTIONS.PASSWORDS, {
					user_id: encryptedAccount._id
				});
			const newEncryptionHash = hash(pad(newmasterpassword, 'masterpwdecrypt'));
			await Promise.all(passwords.map((encryptedPassword) => {
				return new Promise(async (resolve) => {
					const encryptedSection = this.server.database.Crypto.dbDecrypt(
						encryptedPassword.encrypted);
					const decryptedEncrypedSection = decrypt(encryptedSection, 
						decryptedMasterPassword);
					if (decryptedEncrypedSection === ERRS.INVALID_DECRYPT) {
						resolve();
						return;
					}
					
					//Re-encrypt it
					const reEncrypted = encrypt(decryptedEncrypedSection, newEncryptionHash,
						ENCRYPTION_ALGORITHM);				

					await this.server.database.Manipulation.findAndUpdateOne(
						COLLECTIONS.PASSWORDS, {
							_id: encryptedPassword._id
						}, {
							encrypted: this.server.database.Crypto.dbEncrypt(reEncrypted),
							twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(false)
						});
					resolve()
				});
			}));

			//Disable 2FA for all instances
			const instances = await this.server.database.Manipulation.findMany(
				COLLECTIONS.INSTANCES, {
					user_id: encryptedAccount._id
				});

			await Promise.all(instances.map((instance) => {
				return new Promise(async (resolve) => {
					await this.server.database.Manipulation.findAndUpdateOne(
						COLLECTIONS.INSTANCES, {
							_id: instance._id
						}, {
							twofactor_enabled: 
								this.server.database.Crypto.dbEncryptWithSalt(false)
						});
					resolve();
				});
			}));

			//Change password verification key and master password
			const newResetKey = genRandomString(RESET_KEY_LENGTH);

			reset_reset_keys.splice(matchIndex, 1);
			await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.USERS, {
				_id: encryptedAccount._id
			}, {
				pw: this.server.database.Crypto.dbEncrypt(
					hash(pad(newmasterpassword, 'masterpwverify'))),
				reset_key: this.server.database.Crypto.dbEncrypt(encrypt({
						integrity: true as true, // ?
						pw: newmasterpassword
					}, newResetKey, ENCRYPTION_ALGORITHM)
				),
				reset_reset_keys: reset_reset_keys.map((key) => {
					return this.server.database.Crypto.dbEncrypt(key);
				})
			});

			res.status(200);
			res.json({
				success: true,
				data: {
					new_reset_key: newResetKey
				}
			});

			sendEmail(this.server.config, email, 'Account reset undone',
				'Your master password has been changed through an undo and so has your reset key.');
		})(req, res, next);
	}

	public regenkey(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			master_password: MasterPassword;	
		}>([
			'instance_id', 'master_password'
		], [], async (req, res, { instance_id, master_password }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'master_password',
				type: 'string'
			}])) return;

			const { instance } = await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;

			//Check if the master password is correct
			const encryptedAccount = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: instance.user_id
				});
			if (encryptedAccount === null) {
				res.status(200);
				res.json({
					success: false,
					//Failed to parse JSON, incorrect key
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}
			const { pw, email } = this.server.database.Crypto.dbDecryptAccountRecord(encryptedAccount);
			if (pw !== hash(pad(master_password, 'masterpwverify'))) {
				res.status(200);
				res.json({
					success: false,
					//Invalid password
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			//Change password verification key and master password
			const newResetKey = genRandomString(RESET_KEY_LENGTH);

			await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.USERS, {
				_id: encryptedAccount._id
			}, {
				reset_key: this.server.database.Crypto.dbEncrypt(encrypt({
						integrity: true as true, // ?
						pw: master_password
					}, newResetKey, ENCRYPTION_ALGORITHM)
				)
			});

			res.status(200);
			res.json({
				success: true,
				data: {
					new_reset_key: newResetKey
				}
			});

			sendEmail(this.server.config, email, 'Reset key changed',
				'Your reset key has been changed');
		})(req, res, next);
	}
}