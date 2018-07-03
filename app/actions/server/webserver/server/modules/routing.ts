import { MongoRecord, EncryptedAccount, EncryptedInstance, StringifiedObjectId, MasterPassword, DatabaseEncrypted } from "../../../../../database/db-types";
import { Hashed, Padded, MasterPasswordVerificatonPadding } from "../../../../../lib/crypto";
import { COLLECTIONS } from "../../../../../database/database";
import { Webserver } from "../webserver";
import { rateLimit } from "./rateLimit";
import speakeasy = require('speakeasy');
import express = require('express');
import mongo = require('mongodb');

export class WebserverRouter {
	constructor(public parent: Webserver) { 
		this._init();
	}

	private _init() {
		this._register();
	}

	public checkPassword(actualPasswordd: DatabaseEncrypted<EncodedString<Hashed<Padded<string,
			MasterPasswordVerificatonPadding>>>>, 
		expectedPassword: DatabaseEncrypted<EncodedString<Hashed<Padded<string,
			MasterPasswordVerificatonPadding>>>>, _req: express.Request, res: express.Response) {
				if (actualPasswordd !== expectedPassword) {
					res.status(200);
					res.json({
						success: false,
						error: 'invalid credentials'
					});
					return false;
				}
				return true;
			}

	public async checkPasswordFromBody(req: express.Request, res: express.Response, 
		supressErr: boolean = false): Promise<false|MongoRecord<EncryptedAccount>> {
			const { email, password } = req.body as {
				email: string;
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificatonPadding>>;
			};
			if (!email || !password) {
				res.status(400);
				return false;
			}

			//Check if an account with that email exists
			if (!await this.parent.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					email: this.parent.database.Crypto.dbEncrypt(email)
				})) {
					res.status(400);
					res.json({
						success: false,
						error: 'Incorrect combination'
					});
					return false;
				}

			//Check if the password is correct
			const record = await this.parent.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					email: this.parent.database.Crypto.dbEncrypt(email),
					pw: this.parent.database.Crypto.dbEncrypt(password)
				});

			if (!record) {
				if (!supressErr) {
					res.status(400);
					res.json({
						success: false,
						error: 'Incorrect combination'
					});
				}
				return false;
			}
			return record;
		}

	private async _getInstance(id: StringifiedObjectId<EncryptedInstance>) {
		const objectId = new mongo.ObjectId(id);
		return await this.parent.database.Manipulation.findOne(COLLECTIONS.INSTANCES, {
			_id: objectId
		});
	}

	public verify2FA(secret: string, key: string) {
		if (!secret) {
			return false;
		}
		return speakeasy.totp.verify({
			secret: secret,
			encoding: 'base32',
			token: key,
			window: 6
		});
	}

	public requireParams<T extends {
		[key: string]: any;
	}, O extends {
		[key: string]: any;
	} = {}>(requiredParams: (keyof T)[], 
		optionalParams: (keyof O)[]|string[], handler: (req: express.Request, res: express.Response, 
			params: T & Partial<O>) => void): express.RequestHandler {
				return (req, res) => {
					if (!req.body) {
						res.status(400);
						res.json({
							success: false,
							error: 'no request body'
						});
						return;
					}

					const values: T & O = {} as T & O;
					for (const key of requiredParams) {
						if (req.body[key] === undefined || req.body[key] === null) {
							res.status(400);
							res.json({
								success: false,
								error: 'missing parameters'
							});
							return;
						}
						values[key] = req.body[key];
					}
					for (const key of optionalParams) {
						values[key] = req.body[key];
					}

					handler(req, res, values);
				}
			}

	public async verifyAndGetInstance(instanceId: StringifiedObjectId<EncryptedInstance>, res: express.Response) {
		const instance = await this._getInstance(instanceId);
		if (!instance) {
			res.status(400);
			res.json({
				success: false,
				error: 'invalid instance ID'
			});
			return { instance: null, decryptedInstance: null, accountPromise: null };
		}
		const decryptedInstance = this.parent.database.Crypto
			.dbDecryptInstanceRecord(instance);
		const _this = this;
		return { 
			instance, 
			decryptedInstance,
			get accountPromise() {
				return (async() => {
					return _this.parent.database.Crypto.dbDecryptAccountRecord(
						await _this.parent.database.Manipulation.findOne(
							COLLECTIONS.USERS, {
								_id: new mongo.ObjectId(decryptedInstance.user_id)
							}));
				})();
			}
		};
	}

	public verifyLoginToken(token: string, instanceId: StringifiedObjectId<EncryptedInstance>, res: express.Response) {
		if (!this.parent.Auth.verifyLoginToken(token, instanceId)) {
			res.status(200);
			res.json({
				success: false,
				error: 'invalid token'
			});
			return false;
		}
		return true;
	}

	private _register() {
		//Main entrypoint
		this.parent.app.get('/', this.parent.Routes.Dashboard.index);
		this.parent.app.get('/login', this.parent.Routes.Dashboard.login);
		this.parent.app.get('/dashboard', this.parent.Routes.Dashboard.dashboard);

		//API
		this.parent.app.post('/api/instance/register', 
			this.parent.Routes.API.Instance.register);
		this.parent.app.post('/api/instance/login', 
			this.parent.Routes.API.Instance.login);
		this.parent.app.post('/api/instance/extend_key', 
			this.parent.Routes.API.Instance.extendKey);

		this.parent.app.post('/api/instance/2fa/enable', 
			this.parent.Routes.API.Instance.Twofactor.enable);
		this.parent.app.post('/api/instance/2fa/disable', 
			this.parent.Routes.API.Instance.Twofactor.disable);
		this.parent.app.post('/api/instance/2fa/confirm',
			this.parent.Routes.API.Instance.Twofactor.confirm);
		this.parent.app.post('/api/instance/2fa/verify', 
			this.parent.Routes.API.Instance.Twofactor.verify);

		this.parent.app.post('/api/password/set', 
			this.parent.Routes.API.Password.set);
		this.parent.app.post('/api/password/update', 
			this.parent.Routes.API.Password.update);
		this.parent.app.post('/api/password/remove',
			this.parent.Routes.API.Password.remove);
		this.parent.app.post('/api/password/get',
			this.parent.Routes.API.Password.get);
		this.parent.app.post('/api/password/getmeta',
			this.parent.Routes.API.Password.getmeta);
		this.parent.app.post('/api/password/query',
			this.parent.Routes.API.Password.query);
		this.parent.app.post('/api/password/allmeta',
			this.parent.Routes.API.Password.allmeta);

		//TODO: Master master password
	}
}