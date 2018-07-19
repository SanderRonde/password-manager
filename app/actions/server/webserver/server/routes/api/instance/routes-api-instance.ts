import { encryptWithPublicKey, Hashed, Padded, MasterPasswordVerificationPadding, genRSAKeyPair, Encrypted, decryptWithPrivateKey } from "../../../../../../../lib/crypto";
import { EncryptedInstance, StringifiedObjectId, MasterPassword, MongoRecord, ServerPublicKey } from "../../../../../../../database/db-types";
import { RoutesAPIInstanceTwofactor } from "./twofactor/routes-api-instance-2fa";
import { COLLECTIONS } from "../../../../../../../database/database";
import { ResponseCaptured } from "../../../modules/ratelimit";
import { sendEmail, genID } from "../../../../../../../lib/util";
import { API_ERRS } from "../../../../../../../api";
import { Webserver } from "../../../webserver";
import express = require('express');
import mongo = require('mongodb');

export class RoutesApiInstance {
	public Twofactor = new RoutesAPIInstanceTwofactor(this.server);

	constructor(public server: Webserver) { }

	public register(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			email: string;
			public_key: string;
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, {}, {}, {}>([
			'public_key', 'email', 'password'
		], [], async (toCheck, { public_key }) => {
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
			const auth = await this.server.Router.checkPasswordFromBody(req, res);
			if (auth === false) {
				return;
			}

			const { 
				privateKey: serverPrivateKey,
				publicKey: serverPublicKey
			} = genRSAKeyPair();

			const id = genID<EncryptedInstance>();
			const record: MongoRecord<EncryptedInstance> = {
				_id: id,
				twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(false),
				public_key: this.server.database.Crypto.dbEncrypt(public_key),
				user_id: auth._id,
				server_private_key: this.server.database.Crypto.dbEncrypt(serverPrivateKey)
			};
			if (!await this.server.database.Manipulation.insertOne(
				COLLECTIONS.INSTANCES, record)) {
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
					id: encryptWithPublicKey(id.toHexString(), public_key),
					server_key: encryptWithPublicKey(serverPublicKey, public_key)
				}
			});

			sendEmail(this.server.config, auth.email,
				'New instance registered', 'A new instance was registered to your email');
		})(req, res, next);
	}

	public login(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			challenge: Encrypted<EncodedString<string>, ServerPublicKey, 'RSA'>;
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, {}, {}, {}>([
			'instance_id', 'password_hash', 'challenge'
		], [], async (toCheck, { instance_id, password_hash, challenge }) => {
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

			//Get user from instance ID
			const instance = await this.server.database.Manipulation.findOne(
				COLLECTIONS.INSTANCES, {
					_id: new mongo.ObjectId(instance_id)
				});
			
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
			if (!this.server.Router.checkPassword(req, res, 
				password_hash, this.server.database.Crypto.dbDecrypt(account.pw))) {
					return;
				}
			
			//Solve challenge
			const privateKey = this.server.database.Crypto.dbDecrypt(instance.server_private_key);
			const solved = decryptWithPrivateKey(challenge, privateKey);

			if (this.server.database.Crypto.dbDecryptWithSalt(instance.twofactor_enabled)) {
				//Require twofactor authentication before giving out token
				res.status(200);
				res.json({
					success: true,
					data: {
						twofactor_required: true,
						twofactor_auth_token: encryptWithPublicKey(this.server.Auth.genTwofactorToken(
							instance._id.toHexString(), account._id.toHexString()), publicKey),
						challenge: solved
					}
				});
			} else {
				res.status(200);
				res.json({
					success: true,
					data: {
						twofactor_required: false,
						auth_token: encryptWithPublicKey(this.server.Auth.genLoginToken(
							instance._id.toHexString(), account._id.toHexString()), publicKey),
						challenge: solved
					}
				});
			}
		})(req, res, next);
	}

	public logout(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			token: string;
		}, {}, {}, {}>([
			'instance_id', 'token'
		], [], async (toCheck, { instance_id, token }) => {
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

	public extendKey(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			oldToken: string;
		}, {}, {}, {}>([
			'instance_id', 'oldToken'
		], [], async (toCheck, { instance_id, oldToken }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'oldToken',
				type: 'string'
			}])) return;

			const { instance } = await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;

			const publicKey = this.server.database.Crypto.dbDecrypt(
				instance.public_key);

			const newToken = this.server.Auth.extendLoginToken(oldToken, instance_id,
				instance.user_id.toHexString());
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