import { encryptWithPublicKey, Hashed, Padded, MasterPasswordVerificationPadding, genRSAKeyPair, decryptWithPrivateKey } from "../../../../../../../lib/crypto";
import { EncryptedInstance, StringifiedObjectId, MasterPassword, ServerPublicKey, PublicKeyEncrypted } from "../../../../../../../../../shared/types/db-types";
import { RoutesAPIInstanceTwofactor } from "./twofactor/routes-api-instance-2fa";
import { APIToken } from "../../../../../../../../../shared/types/crypto";
import { API_ERRS } from "../../../../../../../../../shared/types/api";
import { COLLECTIONS } from "../../../../../../../database/database";
import { RoutesAPIInstanceU2f } from "./u2f/routes-api-instance-u2f";
import { ServerResponse } from "../../../modules/ratelimit";
import { APP_ID } from "../../../../../../../lib/constants";
import { sendEmail } from "../../../../../../../lib/util";
import { Webserver } from "../../../webserver";
import * as express from 'express'
import * as u2f from 'u2f';

export class RoutesApiInstance {
	public Twofactor = new RoutesAPIInstanceTwofactor(this.server);
	public U2F = new RoutesAPIInstanceU2f(this.server)

	constructor(public server: Webserver) { }

	private static readonly nearInfinity = Date.now() + (1000 * 60 * 60 * 24 * 365 * 1000);
	public async doRegister({
		email, password, public_key, expires = RoutesApiInstance.nearInfinity, 
		db_public_key = public_key
	}: {
		email: string;
		public_key: string;
		db_public_key?: string;
		password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		expires?: number
	}, res: ServerResponse) {
		const auth = await this.server.Router.checkEmailPassword(
			email, password, res);
		if (auth === false) {
			return;
		}

		const { 
			privateKey: serverPrivateKey,
			publicKey: serverPublicKey
		} = genRSAKeyPair();

		const record: EncryptedInstance = {
			twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(false),
			public_key: this.server.database.Crypto.dbEncrypt(db_public_key),
			user_id: auth._id,
			server_private_key: this.server.database.Crypto.dbEncrypt(serverPrivateKey),
			expires: this.server.database.Crypto.dbEncrypt(expires),
			u2f: this.server.database.Crypto.dbEncryptWithSalt(null)
		};
		const result = await this.server.database.Manipulation.insertOne(
			COLLECTIONS.INSTANCES, record);
		if (result === false) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to create record',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}
		
		
		sendEmail(this.server.config, auth.email,
			'New instance registered', 'A new instance was registered to your email');
		return {
			id: encryptWithPublicKey(result.toHexString(), public_key),
			server_key: encryptWithPublicKey(serverPublicKey, public_key)
		}
	}

	public register(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			email: string;
			public_key: string;
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, {}, {}, {}>({
			unencrypted: ['public_key', 'email', 'password']
		}, {}, async (toCheck, { email, password, public_key }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'email',
				type: 'string'
			}, {
				val: 'public_key',
				type: 'string'
			}, {
				val: 'password',
				type: 'string'
			}])) return;

			const result = await this.doRegister({ email, password, public_key }, res);
			if (result) {
				res.status(200);
				res.json({
					success: true,
					data: result
				});
			}
		})(req, res, next);
	}

	public async doLogin({
		instance_id, challenge, password_hash
	}: {
		instance_id: StringifiedObjectId<EncryptedInstance>;
		challenge: PublicKeyEncrypted<string, ServerPublicKey>;
		password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
	}, res: ServerResponse, twofactor_token?: string) {
		//Get user from instance ID
		const instance = await this.server.Router.getInstance(instance_id);
			
		if (!instance) {
			res.status(200);
			res.json({
				success: false,
				//Invalid instance ID
				error: 'invalid credentials',
				ERR: API_ERRS.INVALID_CREDENTIALS
			});
			return;
		}

		const publicKey = this.server.database.Crypto.dbDecrypt(
			instance.public_key);

		const account = await this.server.database.Manipulation.findOne(
			COLLECTIONS.USERS, {
				_id: instance.user_id
			});

		if (account === null) {
			res.status(200);
			res.json({
				success: false,
				//Failed to parse JSON, incorrect key
				error: 'invalid credentials',
				ERR: API_ERRS.INVALID_CREDENTIALS
			});
			return;
		}
		//Check password
		if (!this.server.Router.checkPassword(res, 
			password_hash, this.server.database.Crypto.dbDecrypt(account.pw))) {
				return;
			}
		
		//Solve challenge
		const decryptedInstance = this.server.database.Crypto.dbDecryptInstanceRecord(instance);
		const solved = decryptWithPrivateKey(challenge, decryptedInstance.server_private_key);

		if (decryptedInstance.twofactor_enabled) {
			const decryptedAccount = this.server.database.Crypto.dbDecryptAccountRecord(
				account);
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

			if (!twofactor_token || 
				!this.server.Router.verify2FA(secret, twofactor_token)) {
					res.status(200);
					res.json({
						success: false,
						error: 'invalid credentials',
						ERR: API_ERRS.INVALID_CREDENTIALS
					});
					return;
				}

			}
		const u2fConfig = decryptedInstance.u2f;
		if (u2fConfig !== null) {
			const request = u2f.request(APP_ID, u2fConfig.keyHandle);
			const u2fToken = this.server.Auth.genU2FToken(
				instance._id.toHexString(), decryptedInstance.user_id.toHexString(),
				'verify', request);
			return {
				u2f_required: true,
				request: request,
				u2f_token: u2fToken,
				challenge: solved
			}
		}

		return {
			u2f_required: false,
			auth_token: encryptWithPublicKey(this.server.Auth.genLoginToken(
				instance._id.toHexString(), account._id.toHexString()), publicKey),
			challenge: solved
		}
	}

	public login(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			challenge: PublicKeyEncrypted<string, ServerPublicKey>;
		}, {
			twofactor_token: string;
		}, {
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, {}>({
			unencrypted: ['instance_id', 'challenge'],
			encrypted: ['password_hash']
		}, {
			unencrypted: ['twofactor_token']
		}, async (toCheck, { instance_id, password_hash, challenge, twofactor_token }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'password_hash',
				type: 'string'
			}, {
				val: 'challenge',
				type: 'string'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}])) return;

			const data = await this.doLogin({
				instance_id, password_hash, challenge
			}, res, twofactor_token);
			if (data) {
				res.status(200);
				res.json({
					success: true,
					data
				})
			}
		})(req, res, next);
	}

	public logout(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			token: APIToken;
		}, {}, {}, {}>({
			unencrypted: ['instance_id', 'token']
		}, {}, async (toCheck, { instance_id, token }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}])) return;

			const { instance } = await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;

			if (!this.server.Auth.invalidateToken(token, instance._id.toHexString())) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
			} else {
				res.status(200);
				res.json({
					success: true,
					data: {}
				});
			}
		})(req, res, next);
	}

	public extendKey(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			old_token: APIToken;
			count: number;
		}, {}, {}, {}>({
			unencrypted: ['instance_id', 'old_token', 'count']
		}, {}, async (toCheck, { count, instance_id, old_token }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'old_token',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			const { instance } = await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;

			const publicKey = this.server.database.Crypto.dbDecrypt(
				instance.public_key);

			const newToken = this.server.Auth.extendLoginToken(old_token, count,
				instance_id, instance.user_id.toHexString());
			if (newToken === false) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid key',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
			} else {
				res.status(200);
				res.json({
					success: true,
					data: {
						auth_token: encryptWithPublicKey(newToken, publicKey)
					}
				});
			}
		})(req, res, next);
	}
}