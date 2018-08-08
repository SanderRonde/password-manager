import { decryptWithPrivateKey, ERRS, Hashed, Padded, MasterPasswordVerificationPadding, encryptWithPublicKey, genRSAKeyPair } from "../../../../../../../lib/crypto";
import { ServerPublicKey, MasterPassword, PublicKeyEncrypted, StringifiedObjectId, EncryptedInstance } from "../../../../../../../../../shared/types/db-types";
import { COMM_TOKEN_DEFAULT_EXPIRE_TIME } from "../../../../../../../lib/constants";
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
			encrypted_data: PublicKeyEncrypted<{
				email: string;
				twofactor_token?: string;
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
			}, ServerPublicKey>;
		}, {}, {}, {}>({
			unencrypted: ['comm_token', 'public_key', 'encrypted_data']
		}, {}, async (toCheck, { comm_token, public_key, encrypted_data }) => {
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
			const decrypted = decryptWithPrivateKey(encrypted_data, commData.server_private_key);
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

			//Subsitute public and private key
			const keyPair = genRSAKeyPair();

			const instanceData = await this.server.Routes.API.Instance.doRegister({ 
				email: decrypted.email,
				password: decrypted.password,
				public_key: keyPair.publicKey,
				expires: COMM_TOKEN_DEFAULT_EXPIRE_TIME
			}, res);
			if (!instanceData) return;

			//Decrypt the instance data
			const decryptedInstanceData = {
				id: decryptWithPrivateKey(instanceData.id, 
						keyPair.privateKey),
				server_key: decryptWithPrivateKey(instanceData.server_key,
					keyPair.privateKey)
			}

			//Get a login token
			const loginData = await this.server.Routes.API.Instance.doLogin({
				instance_id: decryptedInstanceData.id as StringifiedObjectId<EncryptedInstance>,
				password_hash: decrypted.password,
				challenge: encryptWithPublicKey('data', decryptedInstanceData.server_key)
			}, res);

			if (!loginData) {
				return;
			}

			const token = (loginData as {
				twofactor_required: false,
				auth_token: PublicKeyEncrypted<string, string>,
				challenge: string
			}).auth_token;

			res.status(200);
			res.json({
				success: true,
				data: {
					auth_token: token,
					id: encryptWithPublicKey(
						decryptedInstanceData.id, public_key),
					server_public_key: encryptWithPublicKey(
						decryptedInstanceData.server_key, public_key)
				}
			});
		})(req, res, next);
	}
}