import { encryptWithPublicKey, Hashed, Padded, MasterPasswordVerificationPadding, genRSAKeyPair, decryptWithPrivateKey } from "../../../../../../../lib/crypto";
import { EncryptedInstance, StringifiedObjectId, MasterPassword, ServerPublicKey, PublicKeyEncrypted } from "../../../../../../../../../shared/types/db-types";
import { RoutesAPIInstanceTwofactor } from "./twofactor/routes-api-instance-2fa";
import { APIToken } from "../../../../../../../../../shared/types/crypto";
import { API_ERRS } from "../../../../../../../../../shared/types/api";
import { COLLECTIONS } from "../../../../../../../database/database";
import { ServerResponse } from "../../../modules/ratelimit";
import { sendEmail } from "../../../../../../../lib/util";
import { Webserver } from "../../../webserver";
import * as express from 'express'

export class RoutesApiInstance {
	public Twofactor = new RoutesAPIInstanceTwofactor(this.server);

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
	}, res: ServerResponse) {
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
		const privateKey = this.server.database.Crypto.dbDecrypt(instance.server_private_key);
		const solved = decryptWithPrivateKey(challenge, privateKey);

		if (this.server.database.Crypto.dbDecryptWithSalt(instance.twofactor_enabled)) {
			//Require twofactor authentication before giving out token
			return {
				twofactor_required: true,
				twofactor_auth_token: encryptWithPublicKey(this.server.Auth.genTwofactorToken(
					instance._id.toHexString(), account._id.toHexString()), publicKey),
				challenge: solved
			};
		} else {
			return {
				twofactor_required: false,
				auth_token: encryptWithPublicKey(this.server.Auth.genLoginToken(
					instance._id.toHexString(), account._id.toHexString()), publicKey),
				challenge: solved
			}
		}
	}

	public login(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			challenge: PublicKeyEncrypted<string, ServerPublicKey>;
		}, {}, {
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, {}>({
			unencrypted: ['instance_id', 'challenge'],
			encrypted: ['password_hash']
		}, {}, async (toCheck, { instance_id, password_hash, challenge }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'password_hash',
				type: 'string'
			}, {
				val: 'challenge',
				type: 'string'
			}])) return;

			const data = await this.doLogin({
				instance_id, password_hash, challenge
			}, res);
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
			oldToken: APIToken;
			count: number;
		}, {}, {}, {}>({
			unencrypted: ['instance_id', 'oldToken', 'count']
		}, {}, async (toCheck, { count, instance_id, oldToken }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'oldToken',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			const { instance } = await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;

			const publicKey = this.server.database.Crypto.dbDecrypt(
				instance.public_key);

			const newToken = this.server.Auth.extendLoginToken(oldToken, count,
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