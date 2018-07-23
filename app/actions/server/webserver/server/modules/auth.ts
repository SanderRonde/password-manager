import { StringifiedObjectId, EncryptedInstance, EncryptedAccount } from "../../../../../database/db-types";
import { EXPIRE_TIME } from "../../../../../lib/constants";

interface InstanceAuthRepresentation {
	instance: StringifiedObjectId<EncryptedInstance>;
	account: StringifiedObjectId<EncryptedAccount>;
	exprires: number;
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
export type LoginToken = string;
/**
 * A token used to verify 2FA access
 */
export type TwofactorVerifyToken = string;

export class WebserverAuth {
	private _usedTokens: Set<LoginToken> = new Set();
	private _expiredTokens: Set<LoginToken> = new Set();
	private _loginTokens: Map<LoginToken, LoginAuthRepresentation> = new Map();
	private _twofactorTokens: Map<TwofactorVerifyToken, InstanceAuthRepresentation> = new Map();
	private readonly _chars = 
		'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

	constructor() { }

	private _genRandomToken(): LoginToken {
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
	}

	public genLoginToken(instance: StringifiedObjectId<EncryptedInstance>,
		account: StringifiedObjectId<EncryptedAccount>) {
			const token = this._genRandomToken();
			this._loginTokens.set(token, {
				instance,
				account,
				exprires: Date.now() + EXPIRE_TIME,
				count: 0
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

	private _isTokenReused(token: LoginToken, account: StringifiedObjectId<EncryptedAccount>) {
		if (this._expiredTokens.has(token)) {
			this._invalidateInstanceTokens(account);
			return true;
		}
		return false;
	}

	private incrementCount(token: LoginToken) {
		if (this._loginTokens.has(token)) {
			const match = this._loginTokens.get(token);
			match!.count += 1;
			this._loginTokens.set(token, match!);
		}
	}

	public verifyLoginToken(token: LoginToken, count: number|COUNT, 
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

	public extendLoginToken(oldToken: LoginToken, count: number, 
		instance: StringifiedObjectId<EncryptedInstance>,
		account: StringifiedObjectId<EncryptedAccount>) {
			if (this.verifyLoginToken(oldToken, count, instance) &&
				!this._isTokenReused(oldToken, account)) {
					//Delete old token
					this._loginTokens.delete(oldToken);
					this._expiredTokens.add(oldToken);

					//Create new token
					return this.genLoginToken(instance, account);
				}
			return false;
		}

	public invalidateToken(token: LoginToken, instance: StringifiedObjectId<EncryptedInstance>) {
		if (this.verifyLoginToken(token, COUNT.ANY_COUNT, instance)) {
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