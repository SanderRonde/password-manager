import { encryptWithPublicKey, Hashed, Padded, MasterPasswordVerificationPadding } from "../../../../../../../lib/crypto";
import { EncryptedInstance, StringifiedObjectId, MasterPassword, MongoRecord } from "../../../../../../../database/db-types";
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
		}, { }>([
			'public_key', 'email', 'password'
		], [], async (req, res, { public_key }) => {
			if (!this.server.Router.typeCheck(req, res, [{
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

			const _id = genID();
			const record: MongoRecord<EncryptedInstance> = {
				_id: _id,
				twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(false),
				public_key: this.server.database.Crypto.dbEncrypt(public_key),
				user_id: this.server.database.Crypto.dbEncrypt(auth._id.toHexString())
			};
			await this.server.database.Manipulation.insertOne(
				COLLECTIONS.INSTANCES, record);
			
			res.status(200);
			res.json({
				success: true,
				data: {
					id: encryptWithPublicKey(_id.toHexString(), public_key)
				}
			});

			sendEmail(this.server.config, auth.email,
				'New instance registered', 'A new instance was registered to your email');
		})(req, res, next);
	}

	public login(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, {}>([
			'instance_id', 'password_hash'
		], [], async (_req, res, { instance_id, password_hash }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'password_hash',
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

			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: this.server.database.Crypto.dbDecrypt(instance.user_id)
				});

			//Check password
			if (!this.server.Router.checkPassword(req, res, 
				this.server.database.Crypto.dbEncrypt(password_hash), account.pw)) {
					return;
				}

			if (instance.twofactor_enabled) {
				//Require twofactor authentication before giving out token
				res.status(200);
				res.json({
					success: true,
					data: {
						twofactor_required: true,
						twofactor_auth_token: this.server.Auth.genTwofactorToken(
							instance._id.toHexString(), account._id.toHexString())
					}
				});
			} else {
				res.status(200);
				res.json({
					success: true,
					data: {
						twofactor_required: false,
						auth_token: this.server.Auth.genLoginToken(
							instance._id.toHexString(), account._id.toHexString())
					}
				});
			}
		})(req, res, next);
	}

	public logout(req: express.Request, res: ResponseCaptured, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
			token: string;
		}, {}>([
			'instance_id', 'token'
		], [], async (_req, res, { instance_id, token }) => {
			if (!this.server.Router.typeCheck(req, res, [{
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
		}, {}>([
			'instance_id', 'oldToken'
		], [], async (_req, res, { instance_id, oldToken }) => {
			if (!this.server.Router.typeCheck(req, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'oldToken',
				type: 'string'
			}])) return;

			const { instance } = await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!instance) return;

			const newToken = this.server.Auth.extendLoginToken(oldToken, instance_id,
				this.server.database.Crypto.dbDecrypt(instance.user_id));
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
						auth_token: newToken
					}
				});
			}
		})(req, res, next);
	}
}