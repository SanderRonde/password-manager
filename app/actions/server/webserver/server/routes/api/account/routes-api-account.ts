import { EncryptedInstance, StringifiedObjectId, MasterPassword } from "../../../../../../../database/db-types";
import { decrypt, encrypt, hash, pad } from "../../../../../../../lib/crypto";
import { COLLECTIONS } from "../../../../../../../database/database";
import { genRandomString } from "../../../../../../../lib/util";
import { CONSTANTS } from "../../../../../../../lib/constants";
import { ResponseCaptured } from "../../../modules/ratelimit";
import { Webserver } from "../../../webserver";
import express = require('express');
import mongo = require('mongodb');

export class RoutesAPIAccount {
	constructor(public server: Webserver) { }

	public reset(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			reset_key: string;
			instance_id: StringifiedObjectId<EncryptedInstance>;
			newmasterpassword: MasterPassword;
		}, {}>([
			'instance_id', 'reset_key', 'newmasterpassword'
		], [], async (req, res, { instance_id, reset_key, newmasterpassword }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'reset_key',
				type: 'string'
			}, {
				val: 'newmasterpassword',
				type: 'string'
			}])) return;

			//Get user from instance ID
			const instance = await this.server.database.Manipulation.findOne(
				COLLECTIONS.INSTANCES, {
					_id: new mongo.ObjectId(instance_id)
				});
			
			if (!instance) {
				res.status(400);
				res.json({
					success: false,
					//Invalid instance ID
					error: 'invalid credentials'
				});
				return;
			}

			const encryptedAccount = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: this.server.database.Crypto.dbDecrypt(instance.user_id)
				});
			const { masterpassword } = this.server.database.Crypto.dbDecryptAccountRecord(
				encryptedAccount);

			let decrypted: {
				integrity: true;
				pw: string;
			};
			try {
				decrypted = decrypt(masterpassword, reset_key);
			} catch(e) {
				res.status(400);
				res.json({
					success: false,
					//Failed to parse JSON, incorrect key
					error: 'invalid credentials'
				});
				return;
			}
			if (decrypted.integrity !== true) {
				res.status(400);
				res.json({
					success: false,
					//Failed to parse JSON, incorrect key
					error: 'invalid credentials'
				});
				return;
			}

			//Correct key, decrypt everything
			const { pw: decryptedMasterPassword } = decrypted;
			const passwords = await this.server.database.Manipulation.findMany(
				COLLECTIONS.PASSWORDS, {
					user_id: this.server.database.Crypto.dbEncrypt(encryptedAccount._id.toHexString())
				});
			const newEncryptionHash = hash(pad(newmasterpassword, 'masterpwdecrypt'));
			await Promise.all(passwords.map((encryptedPassword) => {
				return new Promise(async (resolve) => {
					const encryptedSection = this.server.database.Crypto.dbDecrypt(
						encryptedPassword.encrypted);
					const decryptedEncrypedSection = decrypt(encryptedSection, 
						decryptedMasterPassword)
					
					//Re-encrypt it
					const reEncrypted = encrypt(decryptedEncrypedSection, newEncryptionHash,
						CONSTANTS.encryptionAlgorithm as 'aes-256-ctr');				

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
					user_id: this.server.database.Crypto.dbEncrypt(encryptedAccount._id.toHexString())
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
			const newResetKey = genRandomString(CONSTANTS.resetKeyLength);

			await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.USERS, {
				_id: encryptedAccount._id
			}, {
				pw: this.server.database.Crypto.dbEncrypt(
					hash(pad(newmasterpassword, 'masterpwverify'))),
				masterpassword: this.server.database.Crypto.dbEncrypt(encrypt({
						integrity: true as true, // ?
						pw: newmasterpassword
					}, newResetKey, CONSTANTS.encryptionAlgorithm)
				)
			});

			res.status(200);
			res.json({
				success: true,
				data: {
					new_reset_key: newResetKey
				}
			});
		})(req, res, next);
	}
}