import { AUTH_TOKEN_EXPIRE_TIME, COOKIE_DEFAULT_EXPIRE_TIME, COOKIE_EXTEND_TIME } from "../../../../../lib/constants";
import { StringifiedObjectId, EncryptedInstance, EncryptedAccount } from "../../../../../database/db-types";

interface AccountAuthRepresentation {
	account: StringifiedObjectId<EncryptedAccount>;
	exprires: number;
}

interface InstanceAuthRepresentation extends AccountAuthRepresentation {
	instance: StringifiedObjectId<EncryptedInstance>;
}

interface LoginAuthRepresentation extends InstanceAuthRepresentation {
	count: number;
}

enum COUNT {
	ANY_COUNT
}

/**
 * A token used for logging in
 */
export type APIToken = string;
/**
 * A token used to verify 2FA access
 */
export type TwofactorVerifyToken = string;

export class WebserverAuth {
	private _usedTokens: Set<APIToken> = new Set();
	private _expiredTokens: Set<APIToken> = new Set();
	private _cookieTokens: Map<string, AccountAuthRepresentation> = new Map();
	private _loginTokens: Map<APIToken, LoginAuthRepresentation> = new Map();
	private _twofactorTokens: Map<TwofactorVerifyToken, InstanceAuthRepresentation> = new Map();
	private readonly _chars = 
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

	constructor() { }

	private _genRandomToken(): APIToken {
		let str = '';
		for (let i = 0; i < 256; i++) {
			str += this._chars[Math.floor(Math.random() * this._chars.length)];
		}

		if (this._usedTokens.has(str)) {
			return this._genRandomToken();
		}
		this._usedTokens.add(str);
		return str;
	}

	private _clearExpiredTokens() {
		this._loginTokens.forEach(({ exprires }, key) => {
			if (Date.now() > exprires) {
				this._expiredTokens.add(key);
				this._loginTokens.delete(key);
			}
		});
		this._twofactorTokens.forEach(({ exprires }, key) => {
			if (Date.now() > exprires) {
				this._twofactorTokens.delete(key);
			}
		});
		this._cookieTokens.forEach(({ exprires }, key) => {
			if (Date.now() > exprires) {
				this._cookieTokens.delete(key);
			}
		});
	}

	public genLoginToken(instance: StringifiedObjectId<EncryptedInstance>,
		account: StringifiedObjectId<EncryptedAccount>) {
			const token = this._genRandomToken();
			this._loginTokens.set(token, {
				instance,
				account,
				exprires: Date.now() + AUTH_TOKEN_EXPIRE_TIME,
				count: 0
			});
			return token;
		}

	public genCookie(account: StringifiedObjectId<EncryptedAccount>) {
		const token = this._genRandomToken();
		this._cookieTokens.set(token, {
			account,
			exprires: Date.now() + COOKIE_DEFAULT_EXPIRE_TIME
		});
		return token;
	}

	private _invalidateInstanceTokens(account: StringifiedObjectId<EncryptedAccount>) {
		//Invalidate all tokens awarded to all instances of this account
		for (const [ token, { account: currentAccount } ] of this._loginTokens.entries()) {
			if (account === currentAccount) {
				this._loginTokens.delete(token);
				this._expiredTokens.add(token);
			}
		}

	}

	private _isTokenReused(token: APIToken, account: StringifiedObjectId<EncryptedAccount>) {
		if (this._expiredTokens.has(token)) {
			this._invalidateInstanceTokens(account);
			return true;
		}
		return false;
	}

	private incrementCount(token: APIToken) {
		if (this._loginTokens.has(token)) {
			const match = this._loginTokens.get(token);
			match!.count += 1;
			this._loginTokens.set(token, match!);
		}
	}

	public verifyAPIToken(token: APIToken, count: number|COUNT, 
		instance: StringifiedObjectId<EncryptedInstance>) {
			this._clearExpiredTokens();

			const match = this._loginTokens.get(token);
			if (!match) {
				return false;
			}

			if (match.instance !== instance ||
				match.count !== count) {
					this._loginTokens.delete(token);
					return false;
				}
			this.incrementCount(token);
			return true;
		}

	public verifyCookie(cookie: string) {
		this._clearExpiredTokens();

		const match = this._cookieTokens.get(cookie);
		if (!match) {
			return false;
		}

		//Extend it
		match.exprires = Math.max(match.exprires, Date.now() + COOKIE_EXTEND_TIME);
		this._cookieTokens.set(cookie, match);

		return true;
	}

	public extendLoginToken(oldToken: APIToken, count: number, 
		instance: StringifiedObjectId<EncryptedInstance>,
		account: StringifiedObjectId<EncryptedAccount>) {
			const isReused = this._isTokenReused(oldToken, account);
			if (!isReused && this.verifyAPIToken(oldToken, count, instance)) {
					//Delete old token
					this._loginTokens.delete(oldToken);
					this._expiredTokens.add(oldToken);

					//Create new token
					return this.genLoginToken(instance, account);
				}
			return false;
		}

	public invalidateToken(token: APIToken, instance: StringifiedObjectId<EncryptedInstance>) {
		if (this.verifyAPIToken(token, COUNT.ANY_COUNT, instance)) {
			this._loginTokens.delete(token);
			return true;
		}
		return false;
	}

	public genTwofactorToken(instance: StringifiedObjectId<EncryptedInstance>,
		account: StringifiedObjectId<EncryptedAccount>): TwofactorVerifyToken {
			const token = this._genRandomToken();
			this._twofactorTokens.set(token, {
				instance,
				account,
				exprires: Date.now() + (1000 * 60 * 5)
			});
			return token;
		}

	public verifyTwofactorToken(token: TwofactorVerifyToken, instance: StringifiedObjectId<EncryptedInstance>) {
		this._clearExpiredTokens();

		const match = this._twofactorTokens.get(token);
		if (!match) {
			return false;
		}

		const isValid = match.instance === instance;
		if (isValid) {
			this._twofactorTokens.delete(token);
		}
		return isValid;
	}
}