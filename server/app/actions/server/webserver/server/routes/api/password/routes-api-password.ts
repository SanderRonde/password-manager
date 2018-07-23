import { Encrypted, Hashed, Padded, MasterPasswordDecryptionpadding, encryptWithPublicKey, MasterPasswordVerificationPadding, EncryptionAlgorithm } from "../../../../../../../lib/crypto";
import { StringifiedObjectId, EncryptedInstance, MasterPassword, EncryptedPassword, DecryptedInstance, MongoRecord, TypedObjectID, EncryptedAccount } from "../../../../../../../database/db-types";
import { UnstringifyObjectIDs } from "../../../../../../../database/libs/db-manipulation";
import { COLLECTIONS } from "../../../../../../../database/database";
import { ResponseCaptured } from "../../../modules/ratelimit";
import { API_ERRS } from "../../../../../../../api";
import { LoginToken } from "../../../modules/auth";
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

			if (!password || instance.user_id.toHexString() !== password.user_id.toHexString()) {
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

	private _verify2FAIfEnabled(twofactorSecret: string|null, twofactorToken: string|undefined,
		password: MongoRecord<UnstringifyObjectIDs<EncryptedPassword>>, res: ResponseCaptured) {
			const decryptedPassword = this.server.database.Crypto.dbDecryptPasswordRecord(password);
			if (decryptedPassword.twofactor_enabled && twofactorSecret !== null) {
				//Password is secured with 2FA
				if (!twofactorToken) {
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
			count: number;
			token: LoginToken;
			websites: string[];
			twofactor_enabled: boolean;
			encrypted: EncodedString<{
				data: Encrypted<EncodedString<{
					username: string;
					password: string;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}>;
		}, {}>({
			unencrypted: ['instance_id'], 
			encrypted: ['token', 'count', 'websites', 'encrypted', 'twofactor_enabled']
		}, {}, async (toCheck, { count, instance_id, token, websites, encrypted, twofactor_enabled }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
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
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: new mongo.ObjectId(decryptedInstance.user_id)
				});

			if (account === null) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			//All don't exist
			const id = new mongo.ObjectId();
			const record: MongoRecord<EncryptedPassword> = {
				_id: id as TypedObjectID<EncryptedAccount>,
				user_id: account._id,
				twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(twofactor_enabled),
				websites: websites.map((website) => {
					return {
						host: url.parse(website).hostname || url.parse(website).host || website,
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
			if (!await this.server.database.Manipulation.insertOne(COLLECTIONS.PASSWORDS, record)) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to create record',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}
			res.status(200);
			res.json({
				success: true,
				data: {
					id: id.toHexString()
				}
			})
		})(req, res, next);
	}

	public update(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			token: LoginToken;
			count: number;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, {
			websites: string[];
			twofactor_enabled: boolean;
			twofactor_token: string;
			encrypted: EncodedString<{
				data: Encrypted<EncodedString<{
					username: string;
					password: string;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}>;
		}>({
			unencrypted: ['instance_id'], 
			encrypted: ['token', 'count', 'password_id']
		}, {
			encrypted: ['encrypted', 'twofactor_enabled', 'websites', 'twofactor_token']
		}, async (toCheck, { 
			token, 
			instance_id, 
			password_id, 
			twofactor_token, 
			encrypted, 
			twofactor_enabled, 
			websites,
			count
		}) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
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
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (decryptedInstance === null || accountPromise === null) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const { twofactor_secret } = await accountPromise;
			if (twofactor_secret && twofactor_token === undefined) {
				res.status(200);
				res.json({
					success: false,
					error: 'missing parameters',
					ERR: API_ERRS.MISSING_PARAMS
				});
				return;
			}

			if (!this._verify2FAIfEnabled(twofactor_secret, twofactor_token,
				password, res)) return;

			if (!await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.PASSWORDS, {
				_id: new mongo.ObjectId(password_id)
			}, {
				twofactor_enabled: typeof twofactor_enabled === 'boolean' ?
					this.server.database.Crypto.dbEncryptWithSalt(twofactor_enabled) : undefined,
				websites: Array.isArray(websites) ?
					websites.map((website) => {
						return {
							host: url.parse(website).hostname || url.parse(website).host || website,
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
			})) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to update record',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}
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
			count: number;
			token: LoginToken;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, {
			twofactor_token: string;
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'token', 'password_id']
		}, {
			encrypted: ['twofactor_token']
		}, async (toCheck, { count, token, instance_id, password_id, twofactor_token }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
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
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (decryptedInstance === null || accountPromise === null) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const { twofactor_secret } = await accountPromise;
			if (!this._verify2FAIfEnabled(twofactor_secret, twofactor_token,
				password, res)) return;

			if (!await this.server.database.Manipulation.deleteOne(COLLECTIONS.PASSWORDS, {
				_id: password._id
			})) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to create record',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}
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
			count: number;
			token: LoginToken;
			password_id: StringifiedObjectId<EncryptedPassword>;	
		}, {
			twofactor_token: string;	
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'password_id']
		}, {
			encrypted: ['twofactor_token']
		}, async (toCheck, { count, token, instance_id, password_id, twofactor_token }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
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
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (decryptedInstance === null || accountPromise === null) return;

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
			count: number;
			token: LoginToken;
			password_id: StringifiedObjectId<EncryptedPassword>;	
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'password_id']
		}, {}, async (toCheck, { count, token, instance_id, password_id }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_id',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

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
			count: number;
			token: LoginToken;
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;	
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'password_hash']
		}, {}, async (toCheck, { count, token, instance_id, password_hash }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_hash',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			//Verify password
			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: decryptedInstance.user_id
				});

			if (!account) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			if (!this.server.Router.checkPassword(req, res, 
				password_hash, this.server.database.Crypto.dbDecrypt(account.pw))) {
					return;
				}

			const passwords = await this.server.database.Manipulation.findMany(
				COLLECTIONS.PASSWORDS, {
					user_id: account._id
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
			count: number;
			token: LoginToken;
			url: string;	
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'url']
		}, {}, async (toCheck, { count, token, instance_id, url: website_url }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'url',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}])) return;
			
			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: decryptedInstance.user_id
				});
		
			if (!account) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			const host = url.parse(website_url).hostname || 
				url.parse(website_url).host || website_url;
			const unfilteredPasswords = await this.server.database.Manipulation.findMany(
				COLLECTIONS.PASSWORDS, {
					user_id: account._id
				});
			if (unfilteredPasswords === null) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to find records',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}
			const passwords = unfilteredPasswords.filter(({ websites }) => {
				for (const website of websites) {
					if (this.server.database.Crypto.dbDecrypt(website.host) === host) {
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