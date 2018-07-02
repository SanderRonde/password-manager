import { MongoRecord, EncryptedAccount, TypedObjectID, Instance, StringifiedObjectId, MasterPassword } from "../../../../../database/dbtypes";
import { encryptWithPublicKey, Hashed, Padded, MasterPasswordVerificatonPadding } from "../../../../../lib/crypto";
import { COLLECTIONS } from "../../../../../database/database";
import { sendEmail } from "../../../../../lib/util";
import { Webserver } from "../webserver";
import speakeasy = require('speakeasy');
import express = require('express');
import mongo = require('mongodb');

export class WebserverRouter {
	private readonly BASE_TIMEOUT = 1000 * 60 * 10;

	constructor(private _parent: Webserver) { 
		this._init();
	}

	private _init() {
		this._register();
	}

	private _validCookies: {
		email: string;
		cookie: string;
		valid_until: number;
	}[] = [];

	private _extendDashboardCookie(toExtend: string) {
		for (const cookie of this._validCookies) {
			if (cookie.cookie === toExtend) {
				cookie.valid_until = Date.now() + this.BASE_TIMEOUT;
			}
		}
	}

	private _invalidateDashboardCookies() {
		this._validCookies = this._validCookies.filter(({ valid_until }) => {
			return Date.now() < valid_until;
		});
	}

	private isDashboardAuthenticated(req: express.Request, res: express.Response) {
		const { login_auth } = req.cookies;
			if (!login_auth) {
				res.redirect('/login');
				return false;
			}
			this._invalidateDashboardCookies();
			for (const { cookie } of this._validCookies) {
				if (cookie === login_auth) {
					this._extendDashboardCookie(cookie);
					return true;
				}
			}
		return false;
	}

	private _incorrectLogin(res: express.Response) {
		res.status(400);
		res.json({
			success: false,
			error: 'Incorrect combination'
		});
	}

	private async _checkPasswordFromBody(req: express.Request, res: express.Response, 
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
			if (!await this._parent.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					email: this._parent.database.Crypto.dbEncrypt(email)
				})) {
					this._incorrectLogin(res);
					return false;
				}

			//Check if the password is correct
			const record = await this._parent.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					email: this._parent.database.Crypto.dbEncrypt(email),
					pw: this._parent.database.Crypto.dbEncrypt(password)
				});

			if (!record) {
				if (!supressErr) {
					this._incorrectLogin(res);
				}
				return false;
			}
			return record;
		}

	private async _getInstance(id: StringifiedObjectId<Instance>) {
		const objectId = new mongo.ObjectId(id);
		return await this._parent.database.Manipulation.findOne(COLLECTIONS.INSTANCES, {
			_id: objectId
		});
	}

	private _verify2FA(secret: string, key: string) {
		return speakeasy.totp.verify({
			secret: secret,
			encoding: 'base32',
			token: key,
			window: 6
		});
	}

	private _requireParams<T extends {
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

	private _register() {
		//Main entrypoint
		this._parent.app.get('/', async (req, res) => {
			if (this.isDashboardAuthenticated(req, res)) {
				res.redirect('/dashboard');
				return;
			}
		});
		this._parent.app.get('/login', async (_req, _res, _next) => {
			//TODO:
		});
		this._parent.app.get('/dashboard', async (req, res) => {
			if (!this.isDashboardAuthenticated(req, res)) {
				return;
			}

			//TODO:
		});

		//API
		this._parent.app.post('/api/instance/register', this._requireParams<{
			email: string;
			public_key: string;
			password: string;
		}, { }>([
			'public_key', 'email', 'password'
		], [], async (req, res, { public_key }) => {
			const auth = await this._checkPasswordFromBody(req, res);
			if (auth === false) {
				return;
			}

			const record: Instance = {
				twofactor_enabled: false,
				twofactor_secret: null,
				public_key: this._parent.database.Crypto.dbEncrypt(public_key),
				user_id: new mongo.ObjectId(auth._id.toHexString()) as TypedObjectID<EncryptedAccount>
			};
			await this._parent.database.Manipulation.insertOne(
				COLLECTIONS.INSTANCES, record);
			
			//Find the record again
			const insertedRecord = await this._parent.database.Manipulation.findOne(
				COLLECTIONS.INSTANCES, record);
			const id = insertedRecord._id.toHexString();

			res.status(200);
			res.json({
				success: true,
				data: {
					id: encryptWithPublicKey(public_key, id)
				}
			});

			sendEmail(this._parent.config, this._parent.database.Crypto.dbDecrypt(auth.email),
				'New instance registered', 'A new instance was registered to your email');
		}));

		this._parent.app.post('/api/instance/set2fa', this._requireParams<{
			id: StringifiedObjectId<Instance>;
			password: string;
			email: string;
		},{
			enable: boolean;
			twofactor_token: string;
		}>([
			'id', 'password', 'email'
		], [
			'enable', 'twofactor_token'
		], async (req, res, { id, enable, twofactor_token }) => {
			const auth = await this._checkPasswordFromBody(req, res);
			if (auth === false) {
				return;
			}

			//Check if 2FA is enabled right now
			// find this instance
			const instance = await this._getInstance(id);
			if (!instance) {
				res.status(400);
				res.json({
					success: false,
					error: 'invalid instance ID'
				});
				return;
			}

			if (instance.twofactor_enabled === enable) {
				res.status(200);
				res.json({
					success: true,
					message: 'state unchanged (was already set)'
				});
				return;
			}

			if (instance.twofactor_enabled) {
				//Require a 2FA key
				if (!this._verify2FA(this._parent.database.Crypto.dbDecrypt(
					instance.twofactor_secret), twofactor_token)) {
						res.status(400);
						res.json({
							success: false,
							error: 'invalid token'
						});
					}

				await this._parent.database.Manipulation.findAndUpdateOne(COLLECTIONS.INSTANCES, {
					_id: instance._id
				}, {
					twofactor_enabled: enable
				});
			} else {
				//Enable it
				const secret = speakeasy.generateSecret({
					name: 'Password Manager'
				});

				await this._parent.database.Manipulation.findAndUpdateOne(COLLECTIONS.INSTANCES, {
					_id: instance._id
				}, {
					twofactor_secret: this._parent.database.Crypto.dbEncrypt(secret.base32)
				});

				res.status(200);
				res.json({
					success: true,
					data: {
						auth_url: secret.otpauth_url
					}
				});
			}
		}));

		this._parent.app.post('/api/instance/verify2fa', this._requireParams<{
			id: StringifiedObjectId<Instance>;
			twofactor_token: string;
		},{
			pw_verification_token: string;
		}>([
			'id', 'twofactor_token'
		], [
			'pw_verification_token'
		], async (_req, res, { id, twofactor_token, pw_verification_token }) => {
			const instance = await this._getInstance(id);
			if (!instance) {
				res.status(400);
				res.json({
					success: false,
					error: 'invalid instance ID'
				});
				return;
			}

			if (!instance.twofactor_secret) {
				res.status(400);
				res.json({
					success: false,
					error: '2FA not enabled'
				});
			}

			if (this._verify2FA(
				this._parent.database.Crypto.dbDecrypt(instance.twofactor_secret), 
					twofactor_token)) {
						if (pw_verification_token) {
							//This is a login attempt
							if (this._parent.Auth.verifyLoginToken(pw_verification_token,
								instance._id.toHexString())) {
									res.status(200);
									res.json({
										success: true,
										data: {
											auth_token: this._parent.Auth.genLoginToken(
												instance._id.toHexString())
										}
									});
								} else {
									res.status(200);
									res.json({
										success: false,
										error: 'invalid 2fa auth token'
									});
								}
						} else {
							//This is an attempt to verify a 2FA secret after adding it
							if (!instance.twofactor_enabled) {
								//Enable it
								await this._parent.database.Manipulation.findAndUpdateOne(COLLECTIONS.INSTANCES, {
									_id: instance._id
								}, {
									twofactor_enabled: true
								});
							}
							res.status(200);
							res.json({
								success: true
							});
						}
					} else {
						res.status(200);
						res.json({
							success: false,
							error: 'invalid token'
						});
					}
		}));

		this._parent.app.post('/api/instance/login', this._requireParams<{
			id: StringifiedObjectId<Instance>;
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificatonPadding>>;
		}, {}>([
			'id', 'password'
		], [], async (_req, res, { id, password }) => {
			//Get user from instance ID
			const instance = await this._parent.database.Manipulation.findOne(
				COLLECTIONS.INSTANCES, {
					_id: new mongo.ObjectId(id)
				});
			
			if (!instance) {
				res.status(400);
				res.json({
					success: false,
					//Invalid instance ID
					error: 'invalid credentials'
				});
				return;
			}

			const user = await this._parent.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: instance.user_id
				});

			//Check password
			if (this._parent.database.Crypto.dbDecrypt(user.pw) !== password) {
				res.status(400);
				res.json({
					success: false,
					//Invalid instance ID
					error: 'invalid credentials'
				});
				return;
			}

			if (instance.twofactor_enabled) {
				//Require twofactor authentication before giving out token
				res.status(200);
				res.json({
					success: true,
					data: {
						twofactor_required: true,
						twofactor_auth_token: this._parent.Auth.genTwofactorToken(
							instance._id.toHexString())
					}
				});
			} else {
				res.status(200);
				res.json({
					success: true,
					data: {
						twofactor_required: false,
						auth_token: this._parent.Auth.genLoginToken(
							instance._id.toHexString())
					}
				});
			}
		}));
	}
}