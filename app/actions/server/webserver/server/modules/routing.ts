import { MongoRecord, EncryptedAccount, EncryptedInstance, StringifiedObjectId, MasterPassword, DatabaseEncrypted } from "../../../../../database/db-types";
import { Hashed, Padded, MasterPasswordVerificationPadding } from "../../../../../lib/crypto";
import { COLLECTIONS } from "../../../../../database/database";
import { Webserver } from "../webserver";
import { getStores, ResponseCaptured, APIResponse } from "./ratelimit";
import speakeasy = require('speakeasy');
import express = require('express');
import mongo = require('mongodb');

type ResponseCapturedRequestHandler = (req: express.Request,
	res: ResponseCaptured, next: express.NextFunction) => any;

type BasicType = 'string'|'boolean'|'number';;
type TypecheckConfig = {
	val: string;
	type: BasicType;
}|{
	val: string;
	type: 'array';
	inner: BasicType;
}

export class WebserverRouter {
	constructor(public parent: Webserver) { 
		this._init();
	}

	private _init() {
		this._register();
	}

	public checkPassword(_req: express.Request, res: ResponseCaptured,
		actualPassword: DatabaseEncrypted<EncodedString<Hashed<Padded<string,
			MasterPasswordVerificationPadding>>>>, 
		expectedPassword: DatabaseEncrypted<EncodedString<Hashed<Padded<string,
			MasterPasswordVerificationPadding>>>>) {
				if (actualPassword !== expectedPassword) {
					res.status(200);
					res.json({
						success: false,
						error: 'invalid credentials'
					});
					return false;
				}
				return true;
			}

	public async checkPasswordFromBody(req: express.Request, res: ResponseCaptured, 
		supressErr: boolean = false): Promise<false|MongoRecord<EncryptedAccount>> {
			const { email, password } = req.body as {
				email: string;
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
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
		optionalParams: (keyof O)[]|string[], handler: (req: express.Request, res: ResponseCaptured, 
			params: T & Partial<O>) => void): ResponseCapturedRequestHandler {
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

	public async verifyAndGetInstance(instanceId: StringifiedObjectId<EncryptedInstance>, res: ResponseCaptured) {
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

	public verifyLoginToken(token: string, instanceId: StringifiedObjectId<EncryptedInstance>, res: ResponseCaptured) {
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

	private _printTypeErr(res: ResponseCaptured, val: string, type: BasicType|'array', inner?: BasicType) {
		if (inner) {
			res.status(400);
			res.json({
				success: false,
				error: `param "${val}" not of type ${type}[]`
			});
		} else {
			res.status(400);
			res.json({
				success: false,
				error: `param "${val}" not of type ${type}`
			});
		}
	}

	public typeCheck(req: express.Request, res: ResponseCaptured, configs: TypecheckConfig[]) {
		const body = req.body;
		for (const config of configs) {
			const { val, type } = config;
			if (!(val in body)) {
				continue;
			}
			const value = body[val];
			switch (config.type) {
				case 'boolean':
				case 'number':
				case 'string':
					if (typeof value !== type) {
						this._printTypeErr(res, val, type);
						return false;
					}
					break;
				case 'array':
					if (!Array.isArray(value)) {
						this._printTypeErr(res, val, type);
						return false;
					} else {
						for (const item of value) {
							if (typeof item !== config.inner) {
								this._printTypeErr(res, val, type, config.inner);
								return false;
							}
						}
					}
					break;
			}
		}
		return true;
	}

	private _wrapInErrorHandler(fn: (req: express.Request, res: ResponseCaptured, next: express.NextFunction) => any) {
		return (req: express.Request, res: ResponseCaptured, next: express.NextFunction) => {
			try {
				fn(req, res, next);
			} catch(e) {
				res.status(500);
				res.json({
					success: false,
					error: 'server error'
				});
			}
		}
	}

	private _register() {
		this.parent.app.enable('trust proxy');

		//Main entrypoint
		this.parent.app.get('/', this.parent.Routes.Dashboard.index);
		this.parent.app.get('/login', this.parent.Routes.Dashboard.login);
		this.parent.app.get('/dashboard', this.parent.Routes.Dashboard.dashboard);

		this.parent.app.use((_req: express.Request, res: ResponseCaptured, next) => {
			const originalFn = res.json;
			res.json = (response: APIResponse) => {
				res.__jsonResponse = response;
				return originalFn(response);
			}
			next();
		});

		const { 
			apiUseLimiter, 
			instanceCreateLimiter, 
			bruteforceLimiter 
		} = getStores();

		//API
		this.parent.app.post('/api/instance/register', bruteforceLimiter,
			instanceCreateLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Instance.register));
		this.parent.app.post('/api/instance/login', bruteforceLimiter,
			instanceCreateLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Instance.login));
		this.parent.app.post('/api/instance/logout', bruteforceLimiter,
			instanceCreateLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Instance.logout));
		this.parent.app.post('/api/instance/extend_key', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Instance.extendKey));

		this.parent.app.post('/api/instance/2fa/enable', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Instance.Twofactor.enable));
		this.parent.app.post('/api/instance/2fa/disable', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Instance.Twofactor.disable));
		this.parent.app.post('/api/instance/2fa/confirm', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Instance.Twofactor.confirm));
		this.parent.app.post('/api/instance/2fa/verify', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Instance.Twofactor.verify));

		this.parent.app.post('/api/password/set', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Password.set));
		this.parent.app.post('/api/password/update', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Password.update));
		this.parent.app.post('/api/password/remove', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Password.remove));
		this.parent.app.post('/api/password/get', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Password.get));
		this.parent.app.post('/api/password/getmeta', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Password.getmeta));
		this.parent.app.post('/api/password/querymeta', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Password.querymeta));
		this.parent.app.post('/api/password/allmeta', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Password.allmeta));

		this.parent.app.post('/api/user/reset', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Account.reset));
		this.parent.app.post('/api/user/undoreset', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Account.undoreset));
		this.parent.app.post('/api/user/genresetkey', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this.parent.Routes.API.Account.regenkey));
	}
}