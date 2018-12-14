import { MongoRecord, EncryptedAccount, EncryptedInstance, StringifiedObjectId, MasterPassword } from "../../../../../../../shared/types/db-types";
import { Hashed, Padded, MasterPasswordVerificationPadding, decryptWithPrivateKey, ERRS } from "../../../../../lib/crypto";
import { VALID_THEMES_T } from "../../../../../../../shared/types/shared-types";
import { getStores, ServerResponse, APIResponse } from "./ratelimit";
import { APIToken } from "../../../../../../../shared/types/crypto";
import { API_ERRS } from "../../../../../../../shared/types/api";
import { COLLECTIONS } from "../../../../../database/database";
import { DEFAULT_THEME, APP_ID } from "../../../../../lib/constants";
import { Webserver } from "../webserver";
import * as speakeasy from 'speakeasy'
import * as express from 'express'
import * as mongo from 'mongodb'
import * as u2f from 'u2f';

type ResponseCapturedRequestHandler = (req: express.Request,
	res: ServerResponse, next: express.NextFunction) => any;

type BasicType = 'string'|'boolean'|'number';
type TypecheckConfig = {
	val: string;
	type: BasicType;
}|{
	val: string;
	type: 'array';
	inner: BasicType|'object';
}

export class WebserverRouter {
	constructor(public parent: Webserver) { }

	public init() {
		this._register();
	}

	public checkPassword(res: ServerResponse,
		actualPassword: Hashed<Padded<string, MasterPasswordVerificationPadding>>,
		expectedPassword: Hashed<Padded<string, MasterPasswordVerificationPadding>>) {
				if (actualPassword !== expectedPassword) {
					res.status(200);
					res.json({
						success: false,
						error: 'invalid credentials',
						ERR: API_ERRS.INVALID_CREDENTIALS
					});
					return false;
				}
				return true;
			}

	public async checkEmailPassword(email: string, 
		password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>, res: ServerResponse, 
		supressErr: boolean = false): Promise<false|MongoRecord<EncryptedAccount>> {
			if (!email || !password) {
				res.status(200);
				res.json({
					success: false,
					error: 'Incorrect combination',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return false;
			}

			//Check if an account with that email exists
			const record = await this.parent.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					email: email
				});
			if (!record) {
				res.status(200);
				res.json({
					success: false,
					error: 'Incorrect combination',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return false;
			}

			//Check if the password is correct
			
			if (this.parent.database.Crypto.dbDecrypt(record.pw) !== password) {
				if (!supressErr) {
					res.status(200);
					res.json({
						success: false,
						error: 'Incorrect combination',
						ERR: API_ERRS.INVALID_CREDENTIALS
					});
				}
				return false;
			}
			return record;
		}
	
	async getInstance(id: StringifiedObjectId<EncryptedInstance>) {
		if (!mongo.ObjectId.isValid(id)) {
			return null;
		}

		const objectId = new mongo.ObjectId(id);
		const instance = await this.parent.database.Manipulation.findOne(COLLECTIONS.INSTANCES, {
			_id: objectId
		});
		if (instance === null) {
			return null;
		}
		if (Date.now() > this.parent.database.Crypto.dbDecrypt(instance.expires)) {
			await this.parent.database.Manipulation.deleteOne(COLLECTIONS.INSTANCES, {
				_id: instance._id
			});
			return null;
		}
		return instance;
	}

	public verify2FA(secret: string, key: string) {
		if (!secret) {
			return false;
		}
		return speakeasy.totp.verify({
			secret: secret,
			token: key,
			window: 6
		});
	}

	public requireParams<R extends {
		instance_id: StringifiedObjectId<EncryptedInstance>;
		[key: string]: any;
	}, O extends {
		[key: string]: any;
	} = {}, E extends {
		[key: string]: any;
	} = {}, OE extends {
		[key: string]: any;
	} = {}>(requiredParams: {
		unencrypted: (keyof R)[];
		encrypted: (keyof E)[];
	}, optionalParams: {
		unencrypted?: (keyof O)[];
		encrypted?: (keyof OE)[];
	}, handler: (toCheckSrc: R & E,
			params: R & E & Partial<O> & Partial<OE>) => void): ResponseCapturedRequestHandler
	public requireParams<R extends {
		[key: string]: any;
	}, O extends {
		[key: string]: any;
	} = {}, E extends {
		[key: string]: any;
	} = {}, OE extends {
		[key: string]: any;
	} = {}>(requiredParams: {
		unencrypted: (keyof R)[];
	}, optionalParams: {
		unencrypted?: (keyof O)[];
	}, handler: (toCheckSrc: R & E,
			params: R & E & Partial<O> & Partial<OE>) => void): ResponseCapturedRequestHandler;
	public requireParams<R extends {
		[key: string]: any;
	}, O extends {
		[key: string]: any;
	} = {}, E extends {
		[key: string]: any;
	} = {}, OE extends {
		[key: string]: any;
	} = {}>(requiredParams: {
		unencrypted: (keyof R)[];
		encrypted?: (keyof E)[];
	}, optionalParams: {
		unencrypted?: (keyof O)[];
		encrypted?: (keyof OE)[];
	}, handler: (toCheckSrc: R & E,
			params: R & E & Partial<O> & Partial<OE>) => void): ResponseCapturedRequestHandler {
				return async (req, res) => {
					const toCheckUnencrypted: R = req.body;
					let toCheckEncrypted: E & OE= {} as E & OE;
					let toCheckSrc: any & R & E = {...req.body};

					if (!req.body) {
						res.status(200);
						res.json({
							success: false,
							error: 'no request body',
							ERR: API_ERRS.NO_REQUEST_BODY
						});
						return;
					}

					//Decrypt encrypted params
					if (req.body.encrypted) {
						if (!req.body.instance_id) {
							res.status(200);
							res.json({
								success: false,
								error: 'missing parameters',
								ERR: API_ERRS.MISSING_PARAMS
							});
							return;
						}

						const instance = await this.getInstance(req.body.instance_id);
						if (!instance) {
							res.status(200);
							res.json({
								success: false,
								error: 'invalid credentials',
								ERR: API_ERRS.INVALID_CREDENTIALS
							});
							return;
						}

						const privateKey = this.parent.database.Crypto.dbDecrypt(
							instance.server_private_key);
						const decrypted = decryptWithPrivateKey(req.body.encrypted,
							privateKey);
						if (decrypted === ERRS.INVALID_DECRYPT) {
							res.status(200);
							res.json({
								success: false,
								error: 'missing parameters',
								ERR: API_ERRS.MISSING_PARAMS
							});
							return;
						}
						toCheckEncrypted = decrypted as E & OE;
						toCheckSrc = {...toCheckSrc, ...decrypted}
					}

					const values: R & O & E & OE = {} as R & O & E & OE;
					for (const key of requiredParams.unencrypted) {
						if (toCheckUnencrypted[key] === undefined || toCheckUnencrypted[key] === null) {
							res.status(200);
							res.json({
								success: false,
								error: `missing parameter ${key}`,
								ERR: API_ERRS.MISSING_PARAMS
							});
							return;
						}
						values[key] = toCheckUnencrypted[key];
					}
					for (const key of requiredParams.encrypted || []) {
						if (toCheckEncrypted[key] === undefined || toCheckEncrypted[key] === null) {
							res.status(200);
							res.json({
								success: false,
								error: `missing parameter ${key}`,
								ERR: API_ERRS.MISSING_PARAMS
							});
							return;
						}
						values[key] = toCheckEncrypted[key];
					}
					for (const key of optionalParams.unencrypted || []) {
						values[key] = req.body[key];
					}
					for (const key of optionalParams.encrypted || []) {
						values[key] = toCheckEncrypted[key];
					}

					handler(toCheckSrc, values);
				}
			}

	public async verifyAndGetInstance(instanceId: StringifiedObjectId<EncryptedInstance>, res: ServerResponse,
		beVague: boolean = false) {
			const instance = await this.getInstance(instanceId);
			if (!instance) {
				res.status(200);
				res.json({
					success: false,
					error: beVague ? 'invalid credentials' : 'invalid instance ID',
					ERR: API_ERRS.INVALID_CREDENTIALS
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
							(await _this.parent.database.Manipulation.findOne(
								COLLECTIONS.USERS, {
									_id: new mongo.ObjectId(decryptedInstance.user_id)
								}))!);
					})();
				}
			};
		}

	public verifyLoginToken(token: APIToken, count: number, 
		instanceId: StringifiedObjectId<EncryptedInstance>, res: ServerResponse,
		vague: boolean = false) {
			if (!this.parent.Auth.verifyAPIToken(token, count, instanceId)) {
				res.status(200);
				res.json({
					success: false,
					error: vague ? 'invalid credentials' : 'invalid token',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return false;
			}
			return true;
		}

	private _printTypeErr(res: ServerResponse, val: string, type: BasicType|'array', inner?: BasicType|'object') {
		if (inner) {
			res.status(200);
			res.json({
				success: false,
				error: `param "${val}" not of type ${type}[]`,
				ERR: API_ERRS.INVALID_PARAM_TYPES
			});
		} else {
			res.status(200);
			res.json({
				success: false,
				error: `param "${val}" not of type ${type}`,
				ERR: API_ERRS.INVALID_PARAM_TYPES
			});
		}
	}

	public typeCheck(src: any, res: ServerResponse, configs: TypecheckConfig[]) {
		for (const config of configs) {
			const { val, type } = config;
			if (!(val in src)) {
				continue;
			}
			const value = src[val];
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

	private readonly _NEXT_MILLENIUM = new Date(Date.now() + (60 * 60 * 1000 * 24 * 365.25 * 1000));
	private readonly _VALID_THEMES: VALID_THEMES_T[] = ['light', 'dark'];
	public getTheme(req: express.Request, res: ServerResponse): VALID_THEMES_T {
		const { theme } = req.cookies;
		if (theme) {
			if (this._VALID_THEMES.indexOf(theme) !== -1) {
				return theme;
			} else {
				//Set the cookie again
				res.cookie('theme', DEFAULT_THEME, {
					expires: this._NEXT_MILLENIUM,
					path: '/'
				});
			}
		}
		return DEFAULT_THEME;
	}

	private _wrapInErrorHandler(fn: (req: express.Request, res: ServerResponse, next: express.NextFunction) => any) {
		return (req: express.Request, res: ServerResponse, next: express.NextFunction) => {
			try {
				fn(req, res, next);
			} catch(e) {
				res.status(500);
				res.json({
					success: false,
					error: 'server error',
					ERR: API_ERRS.SERVER_ERROR
				});
			}
		}
	}

	private _genRequest(config: {
		keyHandle: string;
		publicKey: string;
	}, instanceId: StringifiedObjectId<EncryptedInstance>, 
		userId: StringifiedObjectId<EncryptedAccount>, type: 'verify'|'enable'|'disable') {
			const request = u2f.request(APP_ID, config.keyHandle);
			const u2fToken = this.parent.Auth.genU2FToken(
				instanceId, userId, type, request);
			return {
				request,
				u2fToken
			}
		}

	public genRequests(config: {
		main: {
			keyHandle: string;
			publicKey: string;
		};
		backup: {
			keyHandle: string;
			publicKey: string;
		}
	}, instanceId: StringifiedObjectId<EncryptedInstance>, 
		userId: StringifiedObjectId<EncryptedAccount>, type: 'verify'|'enable'|'disable' = 'verify') {
			return {
				main: this._genRequest(config.main, instanceId, userId, type),
				backup: this._genRequest(config.backup, instanceId, userId, type)
			}
		}

	private _doBind<P extends any, K extends keyof P>(parent: P, key: K) {
		return (parent[key] as Function).bind(parent);
	}

	private _register() {
		this.parent.app.enable('trust proxy');

		//Main entrypoint
		this.parent.app.get('/', 
			this._doBind(this.parent.Routes.Dashboard, 'index'));
		this.parent.app.get('/login', 
			this._doBind(this.parent.Routes.Dashboard, 'login'));
		this.parent.app.get('/dashboard', 
			this._doBind(this.parent.Routes.Dashboard, 'dashboard'));
		this.parent.app.get('/login_offline', 
			this._doBind(this.parent.Routes.Dashboard, 'login_offline'));
		this.parent.app.get('/dashboard_offline', 
			this._doBind(this.parent.Routes.Dashboard, 'dashboard_offline'));

		this.parent.app.use((_req: express.Request, res: ServerResponse, next) => {
			const originalFn = res.json.bind(res);
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
		} = getStores(this.parent.config);

		//Interal API
		this.parent.app.post('/api/dashboard/login', bruteforceLimiter,
			instanceCreateLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Dashboard, 'login')));
		this.parent.app.post('/api/dashboard/get_comm', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Dashboard, 'get_comm')));

		//External API
		this.parent.app.post('/api/instance/register', bruteforceLimiter,
			instanceCreateLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance, 'register')));
		this.parent.app.post('/api/instance/login', bruteforceLimiter,
			instanceCreateLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance, 'login')));
		this.parent.app.post('/api/instance/logout', bruteforceLimiter,
			instanceCreateLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance, 'logout')));
		this.parent.app.post('/api/instance/extend_key', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance, 'extendKey')));

		this.parent.app.post('/api/instance/2fa/enable', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.Twofactor, 'enable')));
		this.parent.app.post('/api/instance/2fa/disable', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.Twofactor, 'disable')));
		this.parent.app.post('/api/instance/2fa/confirm', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.Twofactor, 'confirm')));
		this.parent.app.post('/api/instance/2fa/verify', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.Twofactor, 'verify')));
		this.parent.app.post('/api/instance/2fa/is_setup', bruteforceLimiter,
			this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.Twofactor, 'isSetup')));

		this.parent.app.post('/api/instance/u2f/enable', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.U2F, 'enable')));
		this.parent.app.post('/api/instance/u2f/disable', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.U2F, 'disable')));
		this.parent.app.post('/api/instance/u2f/confirm', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.U2F, 'confirm')));
		this.parent.app.post('/api/instance/u2f/verify', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.U2F, 'verify')));
		this.parent.app.post('/api/instance/u2f/is_setup', bruteforceLimiter,
			this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.U2F, 'isSetup')));
		this.parent.app.post('/api/instance/u2f/gen_request', bruteforceLimiter,
			this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Instance.U2F, 'genRequest')));

		this.parent.app.post('/api/password/set', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Password, 'set')));
		this.parent.app.post('/api/password/update', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Password, 'update')));
		this.parent.app.post('/api/password/remove', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Password, 'remove')));
		this.parent.app.post('/api/password/get', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Password, 'get')));
		this.parent.app.post('/api/password/getmeta', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Password, 'getmeta')));
		this.parent.app.post('/api/password/querymeta', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Password, 'querymeta')));
		this.parent.app.post('/api/password/allmeta', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Password, 'allmeta')));

		this.parent.app.post('/api/user/reset', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Account, 'reset')));
		this.parent.app.post('/api/user/genresetkey', bruteforceLimiter,
			apiUseLimiter, this._wrapInErrorHandler(
				this._doBind(this.parent.Routes.API.Account, 'regenkey')));
	}
}