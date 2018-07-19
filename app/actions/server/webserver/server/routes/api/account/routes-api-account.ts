import { EncryptedInstance, StringifiedObjectId, MasterPassword } from "../../../../../../../database/db-types";
import { ENCRYPTION_ALGORITHM, RESET_KEY_LENGTH } from "../../../../../../../lib/constants";
import { decrypt, encrypt, hash, pad, ERRS } from "../../../../../../../lib/crypto";
import { genRandomString, sendEmail } from "../../../../../../../lib/util";
import { COLLECTIONS } from "../../../../../../../database/database";
import { ResponseCaptured } from "../../../modules/ratelimit";
import { getDebug } from "../../../../../../../lib/debug";
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
		], [], async (toCheck, { email, reset_key, newmasterpassword }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
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
			const { reset_key: accountResetKey } = 
				this.server.database.Crypto.dbDecryptAccountRecord(encryptedAccount);

			const initialDecrypt = decrypt(accountResetKey, reset_key);
			if (initialDecrypt === ERRS.INVALID_DECRYPT) {
				res.status(200);
				res.json({
					success: false,
					//Failed to parse JSON, incorrect key
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}
			if (initialDecrypt.integrity !== true) {
				res.status(200);
				res.json({
					success: false,
					//Failed to decrypt
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			//Correct key, decrypt everything
			const { pw: decryptedMasterPassword } = initialDecrypt;
			const passwords = await this.server.database.Manipulation.findMany(
				COLLECTIONS.PASSWORDS, {
					user_id: encryptedAccount._id
				});
			if (passwords === null) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to find passwords',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}

			//Disable 2FA for all instances
			const unfilteredInstances = (await this.server.database.Manipulation.findMany(
				COLLECTIONS.INSTANCES, {
					user_id: encryptedAccount._id
				}));
			if (unfilteredInstances === null) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to find instances',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}

			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: encryptedAccount._id
				});
			if (account === null) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to find account',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}

			const newEncryptionHash = hash(pad(newmasterpassword, 'masterpwdecrypt'));

			const updatedPasswordIndexes: number[] = [];
			if ((await Promise.all(passwords.map((encryptedPassword, index) => {
				return new Promise(async (resolve) => {
					const encryptedSection = this.server.database.Crypto.dbDecrypt(
						encryptedPassword.encrypted);
					const decryptedEncrypedSection = decrypt(encryptedSection, 
						decryptedMasterPassword)
					
					if (decryptedEncrypedSection === ERRS.INVALID_DECRYPT) {
						resolve(false);
						return;
					}
					
					//Re-encrypt it
					const reEncrypted = encrypt(decryptedEncrypedSection, newEncryptionHash,
						ENCRYPTION_ALGORITHM);				

					if (await this.server.database.Manipulation.findAndUpdateOne(
						COLLECTIONS.PASSWORDS, {
							_id: encryptedPassword._id
						}, {
							encrypted: this.server.database.Crypto.dbEncrypt(reEncrypted),
							twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(false)
						})) {
							updatedPasswordIndexes.push(index);
							resolve(true)
						} else {
							resolve(false);
						}
				});
			}))).filter(val => !val).length || getDebug(this.server.debug).FAIL_ON_PASSWORDS) {
				//Some updates failed
				for (const index of updatedPasswordIndexes) {
					await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.PASSWORDS, {
						_id: passwords[index]._id
					}, passwords[index]);
				}

				res.status(500);
				res.json({
					success: false,
					error: 'failed to update paswords, restored to previous',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}

			const instances = unfilteredInstances.filter(({ twofactor_enabled }) => {
					return this.server.database.Crypto.dbDecryptWithSalt(twofactor_enabled);
				});

			if ((await Promise.all(instances.map((instance) => {
				return new Promise(async (resolve) => {
					if (!await this.server.database.Manipulation.findAndUpdateOne(
						COLLECTIONS.INSTANCES, {
							_id: instance._id
						}, {
							twofactor_enabled: 
								this.server.database.Crypto.dbEncryptWithSalt(false)
						})) {
							resolve(false);
						} else {
							resolve(true);
						}
				});
			}))).filter(val => !val).length || getDebug(this.server.debug).FAIL_ON_INSTANCE) {
				//Some updates failed
				for (const password of passwords) {
					await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.PASSWORDS, {
						_id: password._id
					}, password);
				}

				for (const instance of instances) {
					await this.server.database.Manipulation.findAndUpdateOne(
						COLLECTIONS.INSTANCES, {
							_id: instance._id
						}, {
							twofactor_enabled: 
								this.server.database.Crypto.dbEncryptWithSalt(true)
						});
				}

				res.status(500);
				res.json({
					success: false,
					error: 'failed to update instances, restored to previous',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}

			//Change password verification key and master password
			const newResetKey = genRandomString(RESET_KEY_LENGTH);

			if (await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.USERS, {
				_id: encryptedAccount._id
			}, {
				pw: this.server.database.Crypto.dbEncrypt(
					hash(pad(newmasterpassword, 'masterpwverify'))),
				reset_key: this.server.database.Crypto.dbEncrypt(encrypt({
						integrity: true as true, // ?
						pw: newmasterpassword
					}, newResetKey, ENCRYPTION_ALGORITHM)
				)
			}) === null || getDebug(this.server.debug).FAIL_ON_ACCOUNT) {
				//Some updates failed
				for (const password of passwords) {
					await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.PASSWORDS, {
						_id: password._id
					}, password);
				}

				for (const instance of instances) {
					await this.server.database.Manipulation.findAndUpdateOne(
						COLLECTIONS.INSTANCES, {
							_id: instance._id
						}, {
							twofactor_enabled: 
								this.server.database.Crypto.dbEncryptWithSalt(true)
						});
				}

				//Restore user as well to be sure
				await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.USERS, {
					_id: encryptedAccount._id
				}, account);

				res.status(500);
				res.json({
					success: false,
					error: 'failed to update account, restored to previous',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}

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

	public regenkey(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			master_password: MasterPassword;
			reset_key: string;
		}>([
			'instance_id', 'master_password'
		], [], async (toCheck, { instance_id, master_password, reset_key }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'master_password',
				type: 'string'
			}, {
				val: 'reset_key',
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
			const { 
				pw, 
				email, 
				reset_key: accountResetKey
			} = this.server.database.Crypto.dbDecryptAccountRecord(encryptedAccount);
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

			//Check if the reset key is correct
			if (reset_key !== accountResetKey) {
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