import { MongoRecord, EncryptedAccount, TypedObjectID, Instance } from "../../../../../database/dbtypes";
import { encryptWithPublicKey, Hashed } from "../../../../../lib/crypto";
import { COLLECTIONS } from "../../../../../database/database";
import { sendEmail } from "../../../../../lib/util";
import { Webserver } from "../webserver";
import speakeasy = require('speakeasy');
import express = require('express');
import mongo = require('mongodb');

export class Router {
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

	private _extendCookie(toExtend: string) {
		for (const cookie of this._validCookies) {
			if (cookie.cookie === toExtend) {
				cookie.valid_until = Date.now() + this.BASE_TIMEOUT;
			}
		}
	}

	private _invalidateCookies() {
		this._validCookies = this._validCookies.filter(({ valid_until }) => {
			return Date.now() < valid_until;
		});
	}

	private isAuthenticated(req: express.Request, res: express.Response) {
		const { login_auth } = req.cookies;
			if (!login_auth) {
				res.redirect('/login');
				return false;
			}
			this._invalidateCookies();
			for (const { cookie } of this._validCookies) {
				if (cookie === login_auth) {
					this._extendCookie(cookie);
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

	private async _checkPassword(req: express.Request, 
			res: express.Response): Promise<false|MongoRecord<EncryptedAccount>> {
			const { email, password } = req.body as {
				email: string;
				password: Hashed<string, 'sha512'>;
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
				this._incorrectLogin(res);
				return false;
			}
			return record;
		}

	private async _getInstance(id: TypedObjectID<Instance>) {
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

	private _register() {
		//Main entrypoint
		this._parent.app.get('/', async (req, res) => {
			if (this.isAuthenticated(req, res)) {
				res.redirect('/dashboard');
				return;
			}
		});
		this._parent.app.get('/login', async (_req, _res, _next) => {
			//TODO:
		});
		this._parent.app.get('/dashboard', async (req, res) => {
			if (!this.isAuthenticated(req, res)) {
				return;
			}

			//TODO:
		});

		//API
		this._parent.app.post('/api/instance/register', async (req, res) => {
			if (!req.body || !req.body.public_key) {
				res.status(400);
				res.json({
					success: false,
					error: 'missing request data'
				});
				return;
			}

			const auth = await this._checkPassword(req, res);
			if (auth === false) {
				return;
			}

			const record: Instance = {
				twofactor_enabled: false,
				twofactor_secret: null,
				public_key: this._parent.database.Crypto.dbEncrypt(req.body.public_key),
				user_id: new mongo.ObjectId(auth._id.toHexString())
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
					id: encryptWithPublicKey(req.body.public_key, id)
				}
			});

			sendEmail(this._parent.config, this._parent.database.Crypto.dbDecrypt(auth.email),
				'New instance registered', 'A new instance was registered to your email');
		});

		this._parent.app.post('/api/instance/set2fa', async (req, res) => {
			if (!req.body) {
				res.status(400);
				res.json({
					success: false,
					error: 'missing request data'
				});
				return;
			}

			const auth = await this._checkPassword(req, res);
			if (auth === false) {
				return;
			}

			const { enable, id, password, twofactor_token } = req.body;
			if (!id || !password) {
				res.status(400);
				res.json({
					success: false,
					error: 'missing params'
				});
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
		});

		this._parent.app.post('/api/instance/verify2fa', async (req, res) => {
			if (!req.body) {
				res.status(400);
				res.json({
					success: false,
					error: 'missing request data'
				});
				return;
			}

			const { id, twofactor_token } = req.body;
			if (!id || !twofactor_token) {
				res.status(400);
				res.json({
					success: false,
					error: 'missing params'
				});
				return;
			}

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
						if (!instance.twofactor_enabled) {
							//Enable it
							await this._parent.database.Manipulation.findAndUpdateOne(COLLECTIONS.INSTANCES, {
								_id: instance._id
							}, {
								twofactor_enabled: true
							});
							res.status(200);
							res.json({
								success: true
							});
						}	
					} else {
						res.status(400);
						res.json({
							success: false,
							error: 'invalid token'
						});
					}
		});

		this._parent.app.post('/api/instance/login')
	}
}