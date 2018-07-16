import { Encrypted, Hashed, Padded, MasterPasswordDecryptionpadding, encryptWithPublicKey, MasterPasswordVerificationPadding, EncryptionAlgorithm } from "../../../../../../../lib/crypto";
import { StringifiedObjectId, EncryptedInstance, MasterPassword, EncryptedPassword, DecryptedInstance, MongoRecord } from "../../../../../../../database/db-types";
import { UnstringifyObjectIDs } from "../../../../../../../database/libs/db-manipulation";
import { COLLECTIONS } from "../../../../../../../database/database";
import { ResponseCaptured } from "../../../modules/ratelimit";
import { API_ERRS } from "../../../../../../../api";
import { Webserver } from "../../../webserver";
import express = require('express');
import mongo = require('mongodb');
import url = require('url');

export class RoutesApiPassword {
	constructor(public server: Webserver) { }

	private async _getPasswordIfOwner(passwordId: StringifiedObjectId<EncryptedPassword>, 
		instance: DecryptedInstance, res: ResponseCaptured) {
			//Make sure this password is actually theirs
			const password = await this.server.database.Manipulation.findOne(COLLECTIONS.PASSWORDS, {
				_id: new mongo.ObjectId(passwordId)
			});

			if (!password || instance.user_id !== password.user_id.toHexString()) {
				//Either the password is non-existent or it isn't theirs
				res.status(200);
				res.json({
					success: false,
					error: 'failed',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return { password: null }
			}
			return {
				password: password
			}
		}

	private _verify2FAIfEnabled(twofactorSecret: string, twofactorToken: string,
		password: MongoRecord<UnstringifyObjectIDs<EncryptedPassword>>, res: ResponseCaptured) {
			const decryptedPassword = this.server.database.Crypto.dbDecryptPasswordRecord(password);
			if (decryptedPassword.twofactor_enabled) {
				//Password is secured with 2FA
				if (!twofactorSecret) {
					res.status(400);
					res.json({
						success: false,
						error: 'no 2FA token supplied',
						ERR: API_ERRS.INVALID_CREDENTIALS
					})
					return false;
				}
				if (!this.server.Router.verify2FA(twofactorSecret, twofactorToken)) {
					res.status(200);
					res.json({
						success: false,
						error: 'failed',
						ERR: API_ERRS.INVALID_CREDENTIALS
					});
					return false;
				}
			}
			return true;
		}

	public set(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			token: string;
			websites: string[];
			twofactor_enabled: boolean;
			encrypted: {
				data: Encrypted<EncodedString<{
					username: string;
					password: string;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}
		}, {}>([
			'instance_id', 'token', 'websites', 'encrypted', 'twofactor_enabled'
		], [], async (_req, res, { instance_id, token, websites, encrypted, twofactor_enabled }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'websites',
				type: 'array',
				inner: 'string'
			}, {
				val: 'twofactor_enabled',
				type: 'boolean'
			}, {
				val: 'encrypted',
				type: 'string'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: new mongo.ObjectId(decryptedInstance.user_id)
				});

			//All don't exist
			const record: EncryptedPassword = {
				user_id: account._id,
				twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(twofactor_enabled),
				websites: websites.map((website) => {
					return {
						host: url.parse(website).hostname,
						exact: website
					}
				}).map(({ host, exact }) => {
					return {
						host: this.server.database.Crypto.dbEncrypt(host),
						exact: this.server.database.Crypto.dbEncrypt(exact)
					}
				}),
				encrypted: this.server.database.Crypto.dbEncrypt(encrypted)
			};
			await this.server.database.Manipulation.insertOne(COLLECTIONS.PASSWORDS, record);
			res.status(200);
			res.json({
				success: true,
				data: {}
			})
		})(req, res, next);
	}

	public update(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, {
			websites: string[];
			twofactor_enabled: boolean;
			twofactor_token: string;
			encrypted: {
				data: Encrypted<EncodedString<{
					username: string;
					password: string;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}
		}>([
			'instance_id', 'token'
		], [
			'encrypted', 'twofactor_enabled', 'websites', 'twofactor_token'
		], async (_req, res, { 
			token, 
			instance_id, 
			password_id, 
			twofactor_token, 
			encrypted, 
			twofactor_enabled, 
			websites 
		}) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_id',
				type: 'string'
			}, {
				val: 'websites',
				type: 'array',
				inner: 'string'
			}, {
				val: 'twofactor_enabled',
				type: 'boolean'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}, {
				val: 'encrypted',
				type: 'string'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, instance_id, res)) return;

			const { decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const { twofactor_secret } = await accountPromise;
			if (!this._verify2FAIfEnabled(twofactor_secret, twofactor_token,
				password, res)) return;

			await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.PASSWORDS, {
				_id: new mongo.ObjectId(password_id)
			}, {
				twofactor_enabled: typeof twofactor_enabled === 'boolean' ?
					this.server.database.Crypto.dbEncryptWithSalt(twofactor_enabled) : undefined,
				websites: Array.isArray(websites) ?
					websites.map((website) => {
						return {
							host: url.parse(website).hostname,
							exact: website
						}
					}).map(({ host, exact }) => {
						return {
							host: this.server.database.Crypto.dbEncrypt(host),
							exact: this.server.database.Crypto.dbEncrypt(exact)
						}
					}) : undefined,
				encrypted: encrypted ?
					this.server.database.Crypto.dbEncrypt(encrypted) : undefined
			});
			res.status(200);
			res.json({
				success: true,
				data: {}
			});
		})(req, res, next);
	}

	public remove(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, {
			twofactor_token: string;
		}>([
			'instance_id', 'token', 'password_id'
		], [
			'twofactor_token'
		], async (_req, res, { token, instance_id, password_id, twofactor_token }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_id',
				type: 'string'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, instance_id, res)) return;

			const { decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const { twofactor_secret } = await accountPromise;
			if (!this._verify2FAIfEnabled(twofactor_secret, twofactor_token,
				password, res)) return;

			await this.server.database.Manipulation.deleteOne(COLLECTIONS.PASSWORDS, {
				_id: password._id
			});
			res.status(200);
			res.json({
				success: true,
				data: {}
			});
		})(req, res, next);
	}

	public get(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;	
		}, {
			twofactor_token: string;	
		}>([
			'instance_id', 'token', 'password_id'
		], [
			'twofactor_token'
		], async (_req, res, { token, instance_id, password_id, twofactor_token }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_id',
				type: 'string'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, instance_id, res)) return;

			const { decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const account = await accountPromise;
			if (!this._verify2FAIfEnabled(account.twofactor_secret, twofactor_token,
				password, res)) return;

			const { encrypted } = this.server.database.Crypto
				.dbDecryptPasswordRecord(password);
			res.status(200);
			res.json({
				success: true,
				data: {
					encrypted: encryptWithPublicKey(JSON.stringify({
						id: password._id.toHexString(),
						encrypted: encrypted
					}), decryptedInstance.public_key)
				}
			});
		})(req, res, next);
	}
	
	public getmeta(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;	
		}>([
			'instance_id', 'token', 'password_id'
		], [], async (_req, res, { token, instance_id, password_id }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_id',
				type: 'string'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const { websites, twofactor_enabled } = this.server.database.Crypto
				.dbDecryptPasswordRecord(password);
			res.status(200);
			res.json({
				success: true,
				data: {
					encrypted: encryptWithPublicKey(JSON.stringify({
						id: password._id.toHexString(),
						websites: websites,
						twofactor_enabled: twofactor_enabled		
					}), decryptedInstance.public_key)
				}
			});
		})(req, res, next);
	}

	public allmeta(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			token: string;
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;	
		}>([
			'instance_id', 'token', 'password_hash'
		], [], async (_req, res, { token, instance_id, password_hash }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_hash',
				type: 'string'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			//Verify password
			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: decryptedInstance.user_id
				});

			if (!this.server.Router.checkPassword(req, res, 
				this.server.database.Crypto.dbEncrypt(password_hash), account.pw)) {
					return;
				}

			const passwords = await this.server.database.Manipulation.findMany(
				COLLECTIONS.PASSWORDS, {
					user_id: account._id
				});

			res.status(200);
			res.json({
				success: true,
				data: {
					encrypted: encryptWithPublicKey(JSON.stringify(passwords.map((password) => {
						const decrypted = this.server.database.Crypto
							.dbDecryptPasswordRecord(password);
						return {
							id: password._id.toHexString(),
							websites: decrypted.websites,
							twofactor_enabled: decrypted.twofactor_enabled
						}
					})), decryptedInstance.public_key)
				}
			});
		})(req, res, next);
	}

	public querymeta(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			token: string;
			url: string;	
		}>([
			'instance_id', 'token', 'url'
		], [], async (_req, res, { token, instance_id, url: website_url }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'url',
				type: 'string'
			}])) return;
			
			if (!this.server.Router.verifyLoginToken(token, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: decryptedInstance.user_id
				});

			const { hostname } = url.parse(website_url);
			const passwords = (await this.server.database.Manipulation.findMany(
				COLLECTIONS.PASSWORDS, {
					user_id: account._id
				})).filter(({ websites }) => {
					for (const website of websites) {
						if (this.server.database.Crypto.dbDecrypt(website.host) === hostname) {
							return true;
						}
					}
					return false;
				});

			res.status(200);
			res.json({
				success: true,
				data: {
					encrypted: encryptWithPublicKey(JSON.stringify(passwords.map((password) => {
						const decrypted = this.server.database.Crypto
							.dbDecryptPasswordRecord(password);
						return {
							id: password._id.toHexString(),
							websites: decrypted.websites,
							twofactor_enabled: decrypted.twofactor_enabled
						}
					})), decryptedInstance.public_key)
				}
			});
		})(req, res, next);
	}
}