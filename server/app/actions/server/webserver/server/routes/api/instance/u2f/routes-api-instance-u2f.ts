import { StringifiedObjectId, EncryptedInstance, MasterPassword } from "../../../../../../../../../../shared/types/db-types";
import { Hashed, Padded, MasterPasswordVerificationPadding, encryptWithPublicKey } from "../../../../../../../../lib/crypto";
import { U2FToken } from "../../../../../../../../../../shared/types/crypto";
import { API_ERRS } from "../../../../../../../../../../shared/types/api";
import { COLLECTIONS } from "../../../../../../../../database/database";
import { ServerResponse } from '../../../../modules/ratelimit';
import { APP_ID } from "../../../../../../../../lib/constants";
import { Webserver } from "../../../../webserver";
import * as express from 'express'
import * as u2f from 'u2f';

export class RoutesAPIInstanceU2f {
	constructor(public server: Webserver) { }

	public enable(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, {}>({
			unencrypted: ['instance_id'],
			encrypted: ['password']
		}, {}, async (toCheck, { password, instance_id }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'password',
				type: 'string'
			}])) return;

			const { instance, decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res, true);
			if (instance === null || decryptedInstance === null || accountPromise === null) return;

			const user = await this.server.database.Manipulation.findOne(COLLECTIONS.USERS, {
				_id: instance.user_id
			});
			if (!user) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid credentials1',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			const auth = await this.server.Router.checkEmailPassword(
				user.email, password, res);
			if (auth === false) return;

			if (decryptedInstance.u2f !== null) {
				res.status(200);
				res.json({
					success: true,
					data: {
						message: 'state unchanged (was already set)'
					}
				});
				return;
			}

			const mainRequest = u2f.request(APP_ID);
			const backupRequest = u2f.request(APP_ID);

			res.status(200);
			res.json({
				success: true,
				data: {
					requests: {
						main: {
							request: mainRequest,
							u2fToken: this.server.Auth.genU2FToken(instance._id.toHexString(),
								decryptedInstance.user_id.toHexString(), 'enable', mainRequest)
						},
						backup: {
							request: backupRequest,
							u2fToken: this.server.Auth.genU2FToken(instance._id.toHexString(),
								decryptedInstance.user_id.toHexString(), 'enable', backupRequest)
						}
					}
				}
			});
		})(req, res, next);
	}	

	public disable(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, {}>({
			unencrypted: ['instance_id'],
			encrypted: ['password']
		}, {}, async (toCheck, { password, instance_id }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'password',
				type: 'string'
			}])) return;

			const { instance, decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res, true);
			if (instance === null || decryptedInstance === null || accountPromise === null) return;

			const user = await this.server.database.Manipulation.findOne(COLLECTIONS.USERS, {
				_id: instance.user_id
			});
			if (!user) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			const auth = await this.server.Router.checkEmailPassword(
				user.email, password, res);
			if (auth === false) return;

			if (decryptedInstance.u2f === null) {
				res.status(200);
				res.json({
					success: true,
					data: {
						message: 'state unchanged (was already set)'
					}
				});
				return;
			};

			res.status(200);
			res.json({
				success: true,
				data: {
					requests: this.server.Router.genRequests(decryptedInstance.u2f,
						instance._id.toHexString(), decryptedInstance.user_id.toHexString(), 'disable')
				}
			});
		})(req, res, next);
	}

	public confirm(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {
			mainResponse: u2f.U2FSignResponse|u2f.U2FRegisterResponse;
			backupResponse: u2f.U2FSignResponse|u2f.U2FRegisterResponse;
			mainToken: U2FToken;
			backupToken: U2FToken;
		}, {}, {}>({
			unencrypted: ['instance_id']
		}, {
			unencrypted: ['mainToken', 'backupToken', 'mainResponse', 'backupResponse']
		}, async (toCheck, { instance_id, mainToken, backupToken, mainResponse, backupResponse }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}])) return;

			const { instance, decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (instance === null || decryptedInstance === null || accountPromise === null) return;

			const verifiedTokenMain = mainToken ? this.server.Auth.verifyU2FToken(mainToken,
				instance._id.toHexString()) : { isValid: false, type: 'verify', request: null }
			const verifiedTokenBackup = backupToken ? this.server.Auth.verifyU2FToken(backupToken,
				instance._id.toHexString()) : { isValid: false, type: 'verify', request: null };
			if (!verifiedTokenMain.isValid || !verifiedTokenBackup.isValid) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid token',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			if (verifiedTokenMain.type === 'verify') {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid token type',
					ERR: API_ERRS.INVALID_PARAM_TYPES
				});
				return;
			}

			if (verifiedTokenMain.type === 'enable') {
				const verifiedResponseMain = u2f.checkRegistration(verifiedTokenMain.request!,
					mainResponse as u2f.U2FRegisterResponse);
				const verifiedResponseBackup = u2f.checkRegistration(verifiedTokenBackup.request!,
					backupResponse as u2f.U2FRegisterResponse);
				if (!verifiedResponseMain.successful || !verifiedResponseBackup.successful) {
					res.status(200);
					res.json({
						success: false,
						error: 'invalid credentials',
						ERR: API_ERRS.INVALID_CREDENTIALS
					});
					return;
				}

				//Enable it
				if (!await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.INSTANCES, {
					_id: instance._id
				}, {
					u2f: this.server.database.Crypto.dbEncryptWithSalt(JSON.stringify({
						main: {
							keyHandle: verifiedResponseMain.keyHandle,
							publicKey: verifiedResponseMain.publicKey,
						},
						backup: {
							keyHandle: verifiedResponseBackup.keyHandle,
							publicKey: verifiedResponseBackup.publicKey,
						}
					} as {
						main: {
							keyHandle: string;
							publicKey: string;
						}
						backup: {
							keyHandle: string;
							publicKey: string;
						}
					}) as EncodedString<{
						main: {
							keyHandle: string;
							publicKey: string;
						}
						backup: {
							keyHandle: string;
							publicKey: string;
						}
					}>)
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
			} else {
				//Disable
				const registration = decryptedInstance.u2f!;
				const verifiedResponseMain = u2f.checkSignature(verifiedTokenMain.request!,
					mainResponse as u2f.U2FSignResponse, registration.main.publicKey);
				const verifiedResponseBackup = u2f.checkSignature(verifiedTokenBackup.request!,
					backupResponse as u2f.U2FSignResponse, registration.backup.publicKey);
				if (!verifiedResponseMain.successful && !verifiedResponseBackup.successful) {
					res.status(200);
					res.json({
						success: false,
						error: 'invalid credentials',
						ERR: API_ERRS.INVALID_CREDENTIALS
					});
					return;
				}

				//Disable it
				if (!await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.INSTANCES, {
					_id: instance._id
				}, {
					u2f: this.server.database.Crypto.dbEncryptWithSalt(null)
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
			}
		})(req, res, next);
	}

	public verify(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			token: U2FToken;
			response: u2f.U2FSignResponse;
		}, {}, {}, {}>({
			unencrypted: ['instance_id', 'token']
		}, {}, async (toCheck, { instance_id, token, response }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}])) return;

			const { instance, accountPromise, decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (instance === null || accountPromise === null || decryptedInstance === null) return;

			//Check if it's even enabled
			const registration = decryptedInstance.u2f;
			if (registration === null) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid response',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			const publicKey = this.server.database.Crypto.dbDecrypt(instance.public_key);
			const verifiedToken = this.server.Auth.verifyU2FToken(token,
				instance._id.toHexString());
			if (verifiedToken.isValid) {
				if (u2f.checkSignature(verifiedToken.request!, response as u2f.U2FSignResponse, 
						registration.main.publicKey).successful || 
					u2f.checkSignature(verifiedToken.request!, response as u2f.U2FSignResponse, 
						registration.backup.publicKey).successful) {
						//This is a login attempt
						res.status(200);
						res.json({
							success: true,
							data: {
								auth_token: encryptWithPublicKey(
									this.server.Auth.genLoginToken(instance_id, 
									instance.user_id.toHexString()), publicKey)
							}
						});
					} else {
						res.status(200);
						res.json({
							success: false,
							error: 'invalid response',
							ERR: API_ERRS.INVALID_CREDENTIALS
						});
					}
			} else {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid response',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
			}
		})(req, res, next);
	}
}