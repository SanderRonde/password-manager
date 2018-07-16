import { StringifiedObjectId, EncryptedInstance, MasterPassword } from '../../../../../../../../database/db-types';
import { Hashed, Padded, MasterPasswordVerificationPadding } from '../../../../../../../../lib/crypto';
import { COLLECTIONS } from '../../../../../../../../database/database';
import { ResponseCaptured } from '../../../../modules/ratelimit';
import { API_ERRS } from '../../../../../../../../api';
import { Webserver } from '../../../../webserver';
import speakeasy = require('speakeasy');
import express = require('express');
import mongo = require('mongodb');


export class RoutesAPIInstanceTwofactor {
	constructor(public server: Webserver) { }

	public enable(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
			email: string;
		}, {}, {}, {}>([
			'instance_id', 'password', 'email'
		], [], async (req, res, { instance_id }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'password',
				type: 'string'
			}, {
				val: 'email',
				type: 'string'
			},])) return;

			const auth = await this.server.Router.checkPasswordFromBody(req, res);
			if (auth === false) return;

			const { instance, decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;

			if (decryptedInstance.twofactor_enabled === true) {
				res.status(200);
				res.json({
					success: true,
					data: {
						message: 'state unchanged (was already set)'
					}
				});
				return;
			}

			//Check if a secret already exists
			const { twofactor_secret } = await accountPromise;

			if (!twofactor_secret) {
				//Create a new one
				const secret = speakeasy.generateSecret({
					name: 'Password Manager'
				});
	
				await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.USERS, {
					_id: new mongo.ObjectId(this.server.database.Crypto.dbDecrypt(instance.user_id))
				}, {
					twofactor_secret: this.server.database.Crypto.dbEncryptWithSalt(secret.base32),
					twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(false)
				});
	
				res.status(200);
				res.json({
					success: true,
					data: {
						enabled: false,
						verify_2fa_required: true,
						auth_url: secret.otpauth_url
					}
				});
			} else {
				//One already exists, allow this
				await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.INSTANCES, {
					_id: instance._id
				}, {
					twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(true)
				});
				res.status(200);
				res.json({
					success: true,
					data: {
						enabled: true
					}
				});
			}
		})(req, res, next);
	}	

	public disable(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
			email: string;
			twofactor_token: string;
		}, {}, {}, {}>([
			'instance_id', 'password', 'email', 'twofactor_token'
		], [], async (req, res, { instance_id, twofactor_token }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'password',
				type: 'string'
			}, {
				val: 'email',
				type: 'string'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}])) return;

			const auth = await this.server.Router.checkPasswordFromBody(req, res);
			if (auth === false) return;

			const { instance, decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;

			if (decryptedInstance.twofactor_enabled === false) {
				res.status(200);
				res.json({
					success: true,
					data: {
						message: 'state unchanged (was already set)'
					}
				});
				return;
			}

			const { twofactor_secret } = await accountPromise;

			if (!this.server.Router.verify2FA(twofactor_secret, twofactor_token)) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid token',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.INSTANCES, {
				_id: instance._id
			}, {
				twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(false)
			});
			res.status(200);
			res.json({
				success: true,
				data: {
					disabled: true
				}
			});
		})(req, res, next);
	}

	public confirm(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			twofactor_token: string;
		}, {}, {}, {}>([
			'instance_id', 'twofactor_token'
		], [], async (_req, res, { instance_id, twofactor_token }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}])) return;

			const { instance, decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;
			const { twofactor_secret } = await accountPromise;

			if (this.server.Router.verify2FA(twofactor_secret, twofactor_token)) {
				//This is an attempt to verify a 2FA secret after adding it
				if (!decryptedInstance.twofactor_enabled) {
					//Enable it
					await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.INSTANCES, {
						_id: instance._id
					}, {
						twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(true)
					});
				}
				res.status(200);
				res.json({
					success: true,
					data: {}
				});
			} else {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid token',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
			}
		})(req, res, next);
	}

	public verify(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			twofactor_token: string;
			pw_verification_token: string;
		}, {}, {}, {}>([
			'instance_id', 'twofactor_token', 'pw_verification_token'
		], [], async (_req, res, { instance_id, twofactor_token, pw_verification_token }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}, {
				val: 'pw_verification_token',
				type: 'string'
			}])) return;

			const { instance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;
			const { twofactor_secret } = await accountPromise;

			if (this.server.Router.verify2FA(twofactor_secret, twofactor_token)) {
				//This is a login attempt
				if (this.server.Router.verifyLoginToken(pw_verification_token, instance_id, res)) {
					res.status(200);
					res.json({
						success: true,
						data: {
							auth_token: this.server.Auth.genLoginToken(instance_id, 
								this.server.database.Crypto.dbDecrypt(instance.user_id))
						}
					});
				}
			} else {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid token',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
			}
		})(req, res, next);
	}
}