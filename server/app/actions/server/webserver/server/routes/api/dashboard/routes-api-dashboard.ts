import { decryptWithPrivateKey, ERRS, Hashed, Padded, MasterPasswordVerificationPadding } from "../../../../../../../lib/crypto";
import { ServerPublicKey, MasterPassword, PublicKeyEncrypted } from "../../../../../../../../../shared/types/db-types";
import { API_ERRS } from "../../../../../../../../../shared/types/api";
import { COLLECTIONS } from "../../../../../../../database/database";
import { ServerResponse } from "../../../modules/ratelimit";
import { Webserver } from "../../../webserver";
import * as express from 'express'

export class RoutesAPIDashboard {
	constructor(public server: Webserver) { }

	public login(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			comm_token: string;
			public_key: string;
			encrypted: PublicKeyEncrypted<{
				email: string;
				twofactor_token?: string;
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
			}, ServerPublicKey>;
		}, {}, {}, {}>({
			unencrypted: ['comm_token', 'public_key', 'encrypted']
		}, {}, async (toCheck, { comm_token, public_key, encrypted }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'comm_token',
				type: 'string'
			}, {
				val: 'public_key',
				type: 'string'
			}, {
				val: 'encrypted',
				type: 'string'
			}])) return;

			const commData = this.server.Auth.verifyDashboardCommToken(comm_token);
			if (commData === null) {
				res.status(200);
				res.json({
					success: false,
					ERR: API_ERRS.INVALID_CREDENTIALS,
					error: 'invalid comm token'
				});
				return;
			}

			//Decrypt data
			const decrypted = decryptWithPrivateKey(encrypted, commData.server_private_key);
			if (decrypted === ERRS.INVALID_DECRYPT) {
				res.status(200);
				res.json({
					success: false,
					ERR: API_ERRS.INVALID_CREDENTIALS,
					error: 'invalid comm token'
				});
				return;
			}

			//Check the 2FA token
			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					email: decrypted.email
				});
			if (!account) {
				res.status(200);
				res.json({
					success: false,
					error: 'Incorrect combination',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			const decryptedAccount = this.server.database.Crypto.dbDecryptAccountRecord(
				account);
			if (decryptedAccount.twofactor_enabled) {
				const secret = decryptedAccount.twofactor_secret;
				if (secret === null) {
					res.status(500);
					res.json({
						success: false,
						error: 'Server error',
						ERR: API_ERRS.SERVER_ERROR
					});
					return;
				}

				if (!decrypted.twofactor_token || 
					!this.server.Router.verify2FA(secret, decrypted.twofactor_token)) {
						res.status(200);
						res.json({
							success: false,
							error: 'Incorrect combination',
							ERR: API_ERRS.INVALID_CREDENTIALS
						});
						return;
					}
			}

			await this.server.Routes.API.Instance.doRegister({ 
				email: decrypted.email,
				password: decrypted.password,
				public_key: public_key
			}, res);
		})(req, res, next);
	}
}