import { StringifiedObjectId, EncryptedInstance, MasterPassword, EncryptedPassword, DecryptedInstance, MongoRecord, EncryptedAsset, EncryptedAccount } from "../../../../../../../../../shared/types/db-types";
import { Encrypted, Hashed, Padded, MasterPasswordDecryptionpadding, encryptWithPublicKey, MasterPasswordVerificationPadding, genRSAKeyPair, encrypt, hash, pad } from "../../../../../../../lib/crypto";
import { UnstringifyObjectIDs, APIToken, U2FToken, EncryptionAlgorithm } from "../../../../../../../../../shared/types/crypto";
import { SERVER_ROOT, MAX_FILE_BYTES, ENCRYPTION_ALGORITHM } from "../../../../../../../lib/constants";
import { filterUndefined } from "../../../../../../../database/libs/db-manipulation";
import { genTimeBasedString, genRandomString } from "../../../../../../../lib/util";
import { API_ERRS, APIReturns } from "../../../../../../../../../shared/types/api";
import { COLLECTIONS } from "../../../../../../../database/database";
import { ServerResponse } from "../../../modules/ratelimit";
import { Webserver } from "../../../webserver";
import * as express from 'express'
import * as mongo from 'mongodb'
import * as icojs from 'icojs';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as u2f from 'u2f';
import * as url from 'url'

export class RoutesApiPassword {
	constructor(public server: Webserver) { 
		fs.mkdirp(path.join(SERVER_ROOT, 'temp/'));
	}

	private async _getPasswordIfOwner(passwordId: StringifiedObjectId<EncryptedPassword>, 
		instance: DecryptedInstance, res: ServerResponse) {
			//Make sure this password is actually theirs
			const password = await this.server.database.Manipulation.findOne(COLLECTIONS.PASSWORDS, {
				_id: new mongo.ObjectId(passwordId)
			});

			if (!password || instance.user_id.toHexString() !== password.user_id.toHexString()) {
				//Either the password is non-existent or it isn't theirs
				this._respondInvalidCredentials(res);
				return { password: null }
			}
			return {
				password: password
			}
		}

	private _verify2FAIfEnabled(twofactorSecret: string|null, twofactorToken: string|undefined,
		password: MongoRecord<UnstringifyObjectIDs<EncryptedPassword>>, res: ServerResponse) {
			const decryptedPassword = this.server.database.Crypto.dbDecryptPasswordRecord(password);
			if (decryptedPassword.twofactor_enabled && twofactorSecret !== null) {
				//Password is secured with 2FA
				if (!twofactorToken) {
					res.status(200);
					res.json({
						success: false,
						error: 'no 2FA token supplied',
						ERR: API_ERRS.INVALID_CREDENTIALS
					})
					return false;
				}
				if (!this.server.Router.verify2FA(twofactorSecret, twofactorToken)) {
					res.status(200);
					res.json({
						success: false,
						error: 'failed',
						ERR: API_ERRS.INVALID_CREDENTIALS
					});
					return false;
				}
			}
			return true;
		}

	private async _isSameFile(expected: string, actual: Buffer) {
		const expectedContent = await fs.readFile(expected);
		return Buffer.compare(expectedContent, actual);
	}
	
	public async createImageFile(content: Buffer, mime: string) {
		const fileExtension = mime.split('/')[1];
		const fileName = `${genTimeBasedString()}.${fileExtension}`;

		const location = path.join(this.server.assetPath, 'icons', fileName);
		await fs.mkdirp(path.dirname(location));
		await fs.writeFile(location, content);
		return location;
	}

	public async uploadImage(host: string, user_id: StringifiedObjectId<EncryptedAccount>, image: {
		mime: string;
		content: string;
	}): Promise<null|{
		success: true;
		id: StringifiedObjectId<EncryptedAsset>
	}|{
		success: false;
		statusCode: number;
	}> {
		if (image.content.length > MAX_FILE_BYTES) {
			return {
				success: false,
				statusCode: 413
			};
		}

		let imageBuffer = Buffer.from(image.content);

		const [ fileType, format ] = image.mime.split('/');
		if (fileType !== 'image') {
			return {
				success: false,
				statusCode: 415
			}
		}

		if (format === 'x-icon') {
			//Convert to png
			const converted = await icojs.parse(imageBuffer, 'image/png');
			imageBuffer = converted[0].buffer as Buffer;
			image.mime = 'image/png';
		}

		//Check if a different user has already uploaded this image
		const encryptedAsset = await this.server.database.Manipulation.findOne(COLLECTIONS.ASSETS, {
			host
		});

		if (encryptedAsset) {
			const decryptedAsset = this.server.database.Crypto.dbDecryptAssetRecord(
				encryptedAsset);
			if (decryptedAsset.default && 
				await this._isSameFile(decryptedAsset.default, imageBuffer)) {
					//It's the same as the default, leave it the same
					return {
						success: true,
						id: encryptedAsset._id.toHexString()
					}
				}
			if (user_id in decryptedAsset.by_user_id) {
				//User has already uploaded this host, return that
				return {
					success: true,
					id: encryptedAsset._id.toHexString()
				}
			}
			const matches = (await Promise.all(Object.getOwnPropertyNames(decryptedAsset.by_user_id).map(async (key) => {
				return {
					match: this._isSameFile(decryptedAsset.by_user_id[key as any], imageBuffer),
					key
				}
			}))).filter(descr => descr.match);
			const imagePath = !matches[0] ? 
				await this.createImageFile(imageBuffer, image.mime) :
				decryptedAsset.by_user_id[matches[0].key as any];
			decryptedAsset.by_user_id[user_id] = imagePath;
			const update = await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.ASSETS, {
				_id: encryptedAsset._id
			}, {...{
				by_user_id: this.server.database.Crypto.dbEncrypt(decryptedAsset.by_user_id)
			}, ...decryptedAsset.default === null && matches[0] ? {
				//If there was no default yet and another image is the same as this one
				// set this one as the default
				default: this.server.database.Crypto.dbEncrypt(imagePath)
			} : {}});
			if (update === false) {
				return {
					success: false,
					statusCode: 500
				}
			}
			return {
				success: true,
				id: encryptedAsset._id.toHexString()
			}
		} else {
			const imagePath = await this.createImageFile(imageBuffer, image.mime);
			const inserted = await this.server.database.Manipulation.insertOne(COLLECTIONS.ASSETS, {
				host: this.server.database.Crypto.dbEncrypt(host),
				by_user_id: this.server.database.Crypto.dbEncrypt({
					[user_id]: imagePath
				}),
				default: this.server.database.Crypto.dbEncrypt(null)
			});
			if (inserted === false) {
				return {
					success: false,
					statusCode: 500
				}
			}
			return {
				success: true,
				id: inserted.toHexString() as StringifiedObjectId<EncryptedAsset>
			}
		}
	}

	public set(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, { }, {
			count: number;
			token: APIToken;
			websites: {
				url: string;
				favicon: {
					mime: string;
					content: string;
				}|null;
			}[]
			username: string;
			twofactor_enabled: boolean;
			u2f_enabled: boolean;
			encrypted: EncodedString<{
				data: Encrypted<EncodedString<{
					twofactor_secret: string|null,
					password: string|null;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}>;
		}, {}>({
			unencrypted: ['instance_id'], 
			encrypted: [
				'token', 'count', 'websites', 'encrypted', 
				'twofactor_enabled', 'username', 'u2f_enabled'
			]
		}, {}, async (toCheck, { 
			count, instance_id, token, websites, 
			encrypted, twofactor_enabled, username, u2f_enabled
		}) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'websites',
				type: 'array',
				inner: 'object'
			}, {
				val: 'twofactor_enabled',
				type: 'boolean'
			}, {
				val: 'encrypted',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}, {
				val: 'username',
				type: 'string'
			}, {
				val: 'u2f_enabled',
				type: 'boolean'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: new mongo.ObjectId(decryptedInstance.user_id)
				});

			if (account === null) {
				this._respondInvalidCredentials(res);
				return;
			}

			const mappedWebsites = await Promise.all(websites.map(async ({ url: websiteURL, favicon }) => {
				const host = url.parse(websiteURL).hostname || url.parse(websiteURL).host || websiteURL;
				if (favicon !== null) {
					await this.uploadImage(host, account._id.toHexString(), favicon);
				}
				return {
					host: host,
					exact: websiteURL,
					favicon: favicon !== null ?
						await this.uploadImage(host, account._id.toHexString(), favicon) : null
				}
			}));
			for (const mappedWebsite of mappedWebsites) {
				if (mappedWebsite.favicon !== null && mappedWebsite.favicon.success === false) {
					res.status(mappedWebsite.favicon.statusCode);
					res.json({
						success: false,
						error: 'failed to upload image',
						ERR: mappedWebsite.favicon.statusCode === 500 ?
							API_ERRS.SERVER_ERROR :
							API_ERRS.INVALID_PARAM_TYPES
					});
					return;
				}
			}

			const filteredWebsites = mappedWebsites.filter((mappedWebsite) => {
				return mappedWebsite.favicon === null ||
					mappedWebsite.favicon.success === true;
			}) as {
				host: string;
				exact: string;
				favicon: {
					success: true,
					id: StringifiedObjectId<EncryptedAsset>
				}
			}[];

			//Check if U2F is enabled for the instance
			const u2fEnabledOnInstance = decryptedInstance.u2f !== null;

			//All don't exist
			const record: EncryptedPassword = {
				user_id: account._id,
				u2f_enabled: this.server.database.Crypto.dbEncryptWithSalt(u2fEnabledOnInstance && u2f_enabled),
				twofactor_enabled: this.server.database.Crypto.dbEncryptWithSalt(twofactor_enabled),
				websites: filteredWebsites.map(({ host, exact, favicon }) => {
					return {
						host: this.server.database.Crypto.dbEncrypt(host),
						exact: this.server.database.Crypto.dbEncrypt(exact),
						favicon: this.server.database.Crypto.dbEncrypt(favicon ?
							favicon.id : null)
					}
				}),
				username: this.server.database.Crypto.dbEncrypt(username),
				encrypted: this.server.database.Crypto.dbEncrypt(encrypted)
			};
			const result = await this.server.database.Manipulation.insertOne(COLLECTIONS.PASSWORDS, record);
			if (result === false) {
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
					id: result.toHexString()
				}
			})
		})(req, res, next);
	}

	public update(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, { }, {
			token: APIToken;
			count: number;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, {
			addedWebsites: {
				url: string;
				favicon: {
					mime: string;
					content: string;
				}|null;
			}[];
			removedWebsites: {
				url: string;
			}[];
			username: string;
			twofactor_enabled: boolean;
			u2f_enabled: boolean;
			twofactor_token: string;
			encrypted: EncodedString<{
				data: Encrypted<EncodedString<{
					twofactor_secret: string|null;
					password: string|null;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}>;
			response: u2f.U2FSignResponse;
			u2f_token: U2FToken;
		}>({
			unencrypted: ['instance_id'], 
			encrypted: ['token', 'count', 'password_id']
		}, {
			encrypted: [
				'encrypted', 'twofactor_enabled', 'addedWebsites',
				'twofactor_token', 'username', 'u2f_enabled',
				'response', 'u2f_token', 'removedWebsites'
			]
		}, async (toCheck, { 
			token, 
			instance_id, 
			password_id, 
			twofactor_token, 
			encrypted, 
			twofactor_enabled, 
			addedWebsites,
			removedWebsites,
			count,
			username,
			u2f_enabled,
			response,
			u2f_token
		}) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_id',
				type: 'string'
			}, {
				val: 'addedWebsites',
				type: 'array',
				inner: 'object'
			}, {
				val: 'removedWebsites',
				type: 'array',
				inner: 'object'
			}, {
				val: 'twofactor_enabled',
				type: 'boolean'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}, {
				val: 'encrypted',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}, {
				val: 'username',
				type: 'string'
			}, {
				val: 'u2f_enabled',
				type: 'boolean'
			}, {
				val: 'u2f_token',
				type: 'string'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (decryptedInstance === null || accountPromise === null) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const { twofactor_secret } = await accountPromise;
			if (twofactor_secret && twofactor_token === undefined) {
				res.status(200);
				res.json({
					success: false,
					error: 'missing parameters',
					ERR: API_ERRS.MISSING_PARAMS
				});
				return;
			}

			if (!this._verify2FAIfEnabled(twofactor_secret, twofactor_token,
				password, res)) return;

			const decryptedPasword = this.server.database.Crypto.dbDecryptPasswordRecord(password);
			if (decryptedPasword.u2f_enabled) {
				if (decryptedInstance.u2f === null) {
					res.status(200);
					res.json({
						success: false,
						ERR: API_ERRS.INVALID_CREDENTIALS,
						error: 'u2f not set up for this instance'
					});
					return;
				}

				if (!response || !u2f_token) {
					this._respondInvalidCredentials(res);
					return;
				}

				const verifiedToken = this.server.Auth.verifyU2FToken(u2f_token,
					instance_id);
				if (!verifiedToken.isValid || verifiedToken.type !== 'verify') {
					this._respondInvalidCredentials(res);
					return;
				}

				const registration = decryptedInstance.u2f;

				if (!u2f.checkSignature(verifiedToken.request!, response as u2f.U2FSignResponse, 
						registration.main.publicKey).successful && 
					!u2f.checkSignature(verifiedToken.request!, response as u2f.U2FSignResponse, 
						registration.backup.publicKey).successful) {
							this._respondInvalidCredentials(res);
							return;
						}
			}

			const prevWebsites = decryptedPasword.websites.filter((website) => {
				for (const removedWebsite of removedWebsites || []) {
					const websiteURL = removedWebsite.url;
					const host = url.parse(websiteURL).hostname || url.parse(websiteURL).host || websiteURL;
					if (website.host === host) {
						return false;
					}
				}
				return true;
			});

			const mappedWebsites = Array.isArray(addedWebsites) ? await Promise.all(addedWebsites.map(async ({ url: websiteURL, favicon }) => {
				const host = url.parse(websiteURL).hostname || url.parse(websiteURL).host || websiteURL;
				if (favicon !== null) {
					await this.uploadImage(host, decryptedInstance.user_id.toHexString(), favicon);
				}
				return {
					host: host,
					exact: websiteURL,
					favicon: favicon !== null ?
						await this.uploadImage(host, decryptedInstance.user_id.toHexString(), favicon) : null
				}
			})) : undefined;
			for (const mappedWebsite of mappedWebsites || []) {
				if (mappedWebsite.favicon !== null && mappedWebsite.favicon.success === false) {
					res.status(mappedWebsite.favicon.statusCode);
					res.json({
						success: false,
						error: 'failed to upload image',
						ERR: mappedWebsite.favicon.statusCode === 500 ?
							API_ERRS.SERVER_ERROR :
							API_ERRS.INVALID_PARAM_TYPES
					});
					return;
				}
			}

			const filteredWebsites = (Array.isArray(mappedWebsites) ? mappedWebsites.filter((mappedWebsite) => {
				return mappedWebsite.favicon === null ||
					mappedWebsite.favicon.success === true;
			}) : undefined) as undefined|{
				host: string;
				exact: string;
				favicon: {
					success: true,
					id: StringifiedObjectId<EncryptedAsset>
				}
			}[];
			const newWebsites = [...prevWebsites, ...filteredWebsites || []];

			//Check if U2F is enabled for the instance
			const u2fEnabledOnInstance = decryptedInstance.u2f !== null;

			if (!await this.server.database.Manipulation.findAndUpdateOne(COLLECTIONS.PASSWORDS, {
				_id: new mongo.ObjectId(password_id)
			}, filterUndefined({
				u2f_enabled: typeof u2f_enabled === 'boolean' ? 
					this.server.database.Crypto.dbEncryptWithSalt(u2fEnabledOnInstance && u2f_enabled) : undefined,
				twofactor_enabled: typeof twofactor_enabled === 'boolean' ?
					this.server.database.Crypto.dbEncryptWithSalt(twofactor_enabled) : undefined,
				websites: Array.isArray(newWebsites) ?
					newWebsites.map(({ host, exact, favicon }) => {
						return {
							host: this.server.database.Crypto.dbEncrypt(host),
							exact: this.server.database.Crypto.dbEncrypt(exact),
							favicon: this.server.database.Crypto.dbEncrypt((() => {
								if (!favicon) {
									return null;
								}
								if ('success' in favicon) {
									return favicon.id;
								}
								return favicon;
							})())
						}
					}) : undefined,
				encrypted: encrypted ?
					this.server.database.Crypto.dbEncrypt(encrypted) : undefined,
				username: username ?
					this.server.database.Crypto.dbEncrypt(username) : undefined
			}))) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to update record',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}
			res.status(200);
			res.json({
				success: true,
				data: {}
			});
		})(req, res, next);
	}

	public remove(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			count: number;
			token: APIToken;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, {
			twofactor_token: string;
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'token', 'password_id']
		}, {
			encrypted: ['twofactor_token']
		}, async (toCheck, { count, token, instance_id, password_id, twofactor_token }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_id',
				type: 'string'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (decryptedInstance === null || accountPromise === null) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const { twofactor_secret } = await accountPromise;
			if (!this._verify2FAIfEnabled(twofactor_secret, twofactor_token,
				password, res)) return;

			if (!await this.server.database.Manipulation.deleteOne(COLLECTIONS.PASSWORDS, {
				_id: password._id
			})) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to delete record',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}
			res.status(200);
			res.json({
				success: true,
				data: {}
			});
		})(req, res, next);
	}

	private _respondInvalidCredentials(res: ServerResponse) {
		res.status(200);
		res.json({
			success: false,
			ERR: API_ERRS.INVALID_CREDENTIALS,
			error: 'invalid credentials'
		});
	}

	public get(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			count: number;
			token: APIToken;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, {
			twofactor_token: string;
			response: u2f.U2FSignResponse;
			u2f_token: U2FToken;
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'password_id']
		}, {
			encrypted: ['twofactor_token', 'response' ,'u2f_token']
		}, async (toCheck, { 
			count, 
			token, 
			instance_id, 
			password_id, 
			twofactor_token,
			response,
			u2f_token
		}) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_id',
				type: 'string'
			}, {
				val: 'twofactor_token',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}, {
				val: 'u2f_token',
				type: 'string'
			}])) return;

			if (this.server.config.development && password_id.startsWith('idabcde')) {
				const keys = genRSAKeyPair();

				res.status(200);
				res.json({
					success: true,
					data: {
						encrypted: encryptWithPublicKey(JSON.stringify({
							id: password_id,
							websites: [{
								host: 'www.google.com',
								exact: 'www.google.com/login',
								favicon: null
							}],
							username: 'username',
							twofactor_enabled: false,
							u2f_enabled: false,
							encrypted: encrypt({
								password: 'websitepassword' + genRandomString(10),
								notes: new Array(Math.floor(Math.random() * 10)).fill(0).map(() => {
									return genRandomString(25)
								})
							}, hash(pad('defaultpassword', 'masterpwdecrypt')), ENCRYPTION_ALGORITHM)
						}), keys.publicKey),
						privateKey: keys.privateKey,
						hashed: hash(pad('defaultpassword', 'masterpwdecrypt')),
						padded: pad('defaultpassword', 'masterpwdecrypt')
					}
				});
				return;
			}

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res, true)) return;

			const { decryptedInstance, accountPromise } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res, true);
			if (decryptedInstance === null || accountPromise === null) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const account = await accountPromise;
			if (!this._verify2FAIfEnabled(account.twofactor_secret, twofactor_token,
				password, res)) return;

			const { encrypted, websites, twofactor_enabled, username, u2f_enabled } = this.server.database.Crypto
				.dbDecryptPasswordRecord(password);

			if (u2f_enabled) {
				if (decryptedInstance.u2f === null) {
					res.status(200);
					res.json({
						success: false,
						ERR: API_ERRS.INVALID_CREDENTIALS,
						error: 'u2f not set up for this instance'
					});
					return;
				}

				if (!response || !u2f_token) {
					this._respondInvalidCredentials(res);
					return;
				}

				const verifiedToken = this.server.Auth.verifyU2FToken(u2f_token,
					instance_id);
				if (!verifiedToken.isValid || verifiedToken.type !== 'verify') {
					this._respondInvalidCredentials(res);
					return;
				}

				const registration = decryptedInstance.u2f;
				if (!u2f.checkSignature(verifiedToken.request!, response as u2f.U2FSignResponse, 
						registration.main.publicKey).successful && 
					!u2f.checkSignature(verifiedToken.request!, response as u2f.U2FSignResponse, 
						registration.backup.publicKey).successful) {
							this._respondInvalidCredentials(res);
							return;
						}
			}

			res.status(200);
			res.json({
				success: true,
				data: {
					encrypted: encryptWithPublicKey(JSON.stringify({
						id: password._id.toHexString(),
						websites: await Promise.all(websites.map(async (website) => {
							const assetPath = website.favicon === null ?
									null : await this._getAssetPath(website.favicon!, 
										decryptedInstance.user_id.toHexString());
							return {
								host: website.host,
								exact: website.exact,
								favicon: website.favicon === null ? null :
									'/' + path.relative(this.server.assetPath, assetPath!)
							}
						})),
						username,
						twofactor_enabled: twofactor_enabled,
						u2f_enabled: u2f_enabled,
						encrypted: encrypted
					}), decryptedInstance.public_key)
				}
			});
		})(req, res, next);
	}
	
	public getmeta(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			count: number;
			token: APIToken;
			password_id: StringifiedObjectId<EncryptedPassword>;	
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'password_id']
		}, {}, async (toCheck, { count, token, instance_id, password_id }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_id',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const { password } = await this._getPasswordIfOwner(password_id,
				decryptedInstance, res);
			if (!password) return;

			const { websites, twofactor_enabled, username, u2f_enabled } = this.server.database.Crypto
				.dbDecryptPasswordRecord(password);

			res.status(200);
			res.json({
				success: true,
				data: {
					encrypted: encryptWithPublicKey(JSON.stringify({
						id: password._id.toHexString(),
						websites: await Promise.all(websites.map(async (website) => {
							const assetPath = website.favicon === null ?
									null : await this._getAssetPath(website.favicon!, 
										decryptedInstance.user_id.toHexString());
							return {
								host: website.host,
								exact: website.exact,
								favicon: website.favicon === null ? null :
									'/' + path.relative(this.server.assetPath, assetPath!)
							}
						})),
						username,
						twofactor_enabled: twofactor_enabled,
						u2f_enabled: u2f_enabled,
						requests: decryptedInstance.u2f !== null ? 
							this.server.Router.genRequests(decryptedInstance.u2f,
								instance_id, decryptedInstance.user_id.toHexString()) : null,
					}), decryptedInstance.public_key)
				}
			});
		})(req, res, next);
	}

	private async _getAssetPath(id: StringifiedObjectId<EncryptedAsset>, 
		userId: StringifiedObjectId<EncryptedAccount>): Promise<string|null> {
			const encryptedAsset = await this.server.database.Manipulation.findOne(
				COLLECTIONS.ASSETS, {
					_id: id
				});
			if (encryptedAsset === null) {
				return null;
			}

			const decryptedAsset = this.server.database.Crypto.dbDecryptAssetRecord(
				encryptedAsset);
			if (userId in decryptedAsset.by_user_id) {
				return decryptedAsset.by_user_id[userId];
			}
			return decryptedAsset.default || null;
		}

	public async doGetAllMeta(instanceId: StringifiedObjectId<EncryptedInstance>, password: {
		skip: true;
	}|{
		skip: false;
		hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		res: ServerResponse
	}): Promise<{
		code: number;
		data: APIReturns['/api/password/allmeta']
	}|null> {
		const instance = await this.server.Router.getInstance(instanceId);
		if (!instance) {
			return {
				code: 200,
				data: {
					success: false,
					error: 'invalid instance ID',
					ERR: API_ERRS.INVALID_CREDENTIALS
				}
			};
		}
		const decryptedInstance = this.server.database.Crypto
			.dbDecryptInstanceRecord(instance);

		if (!decryptedInstance) {
			return {
				code: 200,
				data: {
					success: false,
					error: 'invalid instance ID',
					ERR: API_ERRS.INVALID_CREDENTIALS
				}
			};
		}

		//Verify password
		const account = await this.server.database.Manipulation.findOne(
			COLLECTIONS.USERS, {
				_id: decryptedInstance.user_id
			});

		if (!account) {
			return {
				code: 200,
				data: {
					success: false,
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				}
			}
		}

		if (password.skip === false) {
			if (!this.server.Router.checkPassword(password.res, 
				password.hash, this.server.database.Crypto.dbDecrypt(account.pw))) {
					return null;
				}
		}

		const passwords = await this.server.database.Manipulation.findMany(
			COLLECTIONS.PASSWORDS, {
				user_id: account._id
			});

		if (passwords === null) {
			return {
				code: 500,
				data: {
					success: false,
					error: 'failed to find passwords',
					ERR: API_ERRS.SERVER_ERROR
				}
			}
		}

		return {
			code: 200,
			data: {
				success: true,
				data: {
					encrypted: encryptWithPublicKey(JSON.stringify(await Promise.all(passwords.map(async (password) => {
						const decrypted = this.server.database.Crypto
							.dbDecryptPasswordRecord(password);
						return {
							id: password._id.toHexString(),
							username: decrypted.username,
							websites: await Promise.all(decrypted.websites.map(async (website) => {
								const assetPath = website.favicon === null ?
									null : await this._getAssetPath(website.favicon!, account._id.toHexString());
								return {
									host: website.host,
									exact: website.exact,
									favicon: website.favicon === null ? null :
										'/' + path.relative(this.server.assetPath, assetPath!)
								}
							})),
							twofactor_enabled: decrypted.twofactor_enabled,
							u2f_enabled: decrypted.u2f_enabled
						}
					}))), decryptedInstance.public_key)
				}
			}
		}
	}

	public allmeta(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			count: number;
			token: APIToken;
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;	
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'password_hash']
		}, {}, async (toCheck, { count, token, instance_id, password_hash }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'password_hash',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}])) return;

			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const response = await this.doGetAllMeta(instance_id, {
				skip: false,
				hash: password_hash,
				res
			});
			if (response === null) return;
			res.status(response.code);
			res.json(response.data);
		})(req, res, next);
	}

	public querymeta(req: express.Request, res: ServerResponse, next: express.NextFunction) {
		this.server.Router.requireParams<{
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, {}, {
			count: number;
			token: APIToken;
			url: string;	
		}>({
			unencrypted: ['instance_id'],
			encrypted: ['token', 'count', 'url']
		}, {}, async (toCheck, { count, token, instance_id, url: website_url }) => {
			if (!this.server.Router.typeCheck(toCheck, res, [{
				val: 'instance_id',
				type: 'string'
			}, {
				val: 'token',
				type: 'string'
			}, {
				val: 'url',
				type: 'string'
			}, {
				val: 'count',
				type: 'number'
			}])) return;
			
			if (!this.server.Router.verifyLoginToken(token, count, instance_id, res)) return;

			const { decryptedInstance } = 
				await this.server.Router.verifyAndGetInstance(instance_id, res);
			if (!decryptedInstance) return;

			const account = await this.server.database.Manipulation.findOne(
				COLLECTIONS.USERS, {
					_id: decryptedInstance.user_id
				});
		
			if (!account) {
				res.status(200);
				res.json({
					success: false,
					error: 'invalid credentials',
					ERR: API_ERRS.INVALID_CREDENTIALS
				});
				return;
			}

			const host = url.parse(website_url).hostname || 
				url.parse(website_url).host || website_url;
			const unfilteredPasswords = await this.server.database.Manipulation.findMany(
				COLLECTIONS.PASSWORDS, {
					user_id: account._id
				});
			if (unfilteredPasswords === null) {
				res.status(500);
				res.json({
					success: false,
					error: 'failed to find records',
					ERR: API_ERRS.SERVER_ERROR
				});
				return;
			}
			const passwords = unfilteredPasswords.filter(({ websites }) => {
				for (const website of websites) {
					if (this.server.database.Crypto.dbDecrypt(website.host) === host) {
						return true;
					}
				}
				return false;
			});

			res.status(200);
			res.json({
				success: true,
				data: {
					encrypted: encryptWithPublicKey(JSON.stringify(await Promise.all(passwords.map(async (password) => {
						const decrypted = this.server.database.Crypto
							.dbDecryptPasswordRecord(password);
						return {
							id: password._id.toHexString(),
							username: decrypted.username,
							websites: await Promise.all(decrypted.websites.map(async (website) => {
								const assetPath = website.favicon === null ?
									null : await this._getAssetPath(website.favicon!, account._id.toHexString());
								return {
									host: website.host,
									exact: website.exact,
									favicon: website.favicon === null ? null :
										'/' + path.relative(this.server.assetPath, assetPath!)
								}
							})),
							twofactor_enabled: decrypted.twofactor_enabled,
							u2f_enabled: decrypted.u2f_enabled
						}
					}))), decryptedInstance.public_key)
				}
			});
		})(req, res, next);
	}
}