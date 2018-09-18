import { StringifiedObjectId, EncryptedInstance, EncryptedAccount, ServerPublicKey, ServerPrivateKey } from '../../../../../../../shared/types/db-types';
import { AUTH_TOKEN_EXPIRE_TIME, COMM_TOKEN_DEFAULT_EXPIRE_TIME } from "../../../../../lib/constants";
import { APIToken, TwofactorVerifyToken, U2FToken } from '../../../../../../../shared/types/crypto';
import { genRSAKeyPair } from "../../../../../lib/crypto";
import { U2FRequest } from 'u2f';

interface AccountAuthRepresentation {
	account: StringifiedObjectId<EncryptedAccount>;
	expires: number;
}

interface InstanceAuthRepresentation extends AccountAuthRepresentation {
	instance: StringifiedObjectId<EncryptedInstance>;
}

interface LoginAuthRepresentation extends InstanceAuthRepresentation {
	count: number;
}

interface DashboardComm {
	server_public_key: ServerPublicKey;
	server_private_key: ServerPrivateKey;
	expires: number;
}

interface U2FAuthRepresentation extends InstanceAuthRepresentation {
	request: U2FRequest;
	type: 'disable'|'verify'|'enable';
};

export enum COUNT {
	ANY_COUNT
}

export class WebserverAuth {
	private _usedTokens: Set<APIToken> = new Set();
	private _expiredTokens: Set<APIToken> = new Set();
	private _dashboardCommToken: Map<string, DashboardComm> = new Map();
	private _loginTokens: Map<APIToken, LoginAuthRepresentation> = new Map();
	private _twofactorTokens: Map<TwofactorVerifyToken, InstanceAuthRepresentation> = new Map();
	private _u2fTokens: Map<U2FToken, U2FAuthRepresentation> = new Map();
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

	private _clearExpiredForMap<K>(container: Map<K, {
		expires: number;
	}>) {
		container.forEach(({ expires }, key) => {
			if (Date.now() > expires) {
				container.delete(key);
			}
		});
	}

	private _clearExpiredTokens() {
		this._loginTokens.forEach(({ expires }, key) => {
			if (Date.now() > expires) {
				this._expiredTokens.add(key);
				this._loginTokens.delete(key);
			}
		});
		this._clearExpiredForMap(this._u2fTokens);
		this._clearExpiredForMap(this._twofactorTokens);
		this._clearExpiredForMap(this._dashboardCommToken);
	}

	public genDashboardCommToken() {
		const token = this._genRandomToken();
		const { privateKey, publicKey } = genRSAKeyPair()
		this._dashboardCommToken.set(token, {
			server_public_key: publicKey,
			server_private_key: privateKey,
			expires: Date.now() + COMM_TOKEN_DEFAULT_EXPIRE_TIME
		});
		return {
			token, privateKey, publicKey
		};
	}

	public genLoginToken(instance: StringifiedObjectId<EncryptedInstance>,
		account: StringifiedObjectId<EncryptedAccount>) {
			const token = this._genRandomToken();
			this._loginTokens.set(token, {
				instance,
				account,
				expires: Date.now() + AUTH_TOKEN_EXPIRE_TIME,
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
				(count !== COUNT.ANY_COUNT && match.count !== count)) {
					this._loginTokens.delete(token);
					return false;
				}
			if (count !== COUNT.ANY_COUNT) {
				this.incrementCount(token);
			}
			return true;
		}

	public verifyDashboardCommToken(token: string) {
		this._clearExpiredTokens();

		const match = this._dashboardCommToken.get(token);
		if (!match) {
			return null;
		}

		return match;
	}

	public extendLoginToken(oldToken: APIToken, count: number, 
		instance: StringifiedObjectId<EncryptedInstance>,
		account: StringifiedObjectId<EncryptedAccount>): {
			success: true;
			token: APIToken;
		}|{
			success: false;
			reason: string;
		} {
			const isReused = this._isTokenReused(oldToken, account);
			if (!isReused && this.verifyAPIToken(oldToken, count, instance)) {
					//Delete old token
					this._loginTokens.delete(oldToken);
					this._expiredTokens.add(oldToken);

					//Create new token
					return {
						success: true,
						token: this.genLoginToken(instance, account)
					}
				}
			return {
				success: false,
				reason: isReused ? 
					'attempt to extend expired token' :
					'attempt to extend invalid token'
			};
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
				expires: Date.now() + (1000 * 60 * 5)
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

	public genU2FToken(instance: StringifiedObjectId<EncryptedInstance>,
		account: StringifiedObjectId<EncryptedAccount>, type: 'enable'|'disable'|'verify',
		request: U2FRequest): U2FToken {
				const token = this._genRandomToken();
				this._u2fTokens.set(token, {
					instance,
					account,
					type,
					request,
					expires: Date.now() + (1000 * 60 * 10)
				});
				return token;
			}

	public verifyU2FToken(token: U2FToken, instance: StringifiedObjectId<EncryptedInstance>): {
		isValid: true;
		type: 'disable'|'verify'|'enable';
		request: U2FRequest;
	}|{
		isValid: false;
		type: null;
		request: null;
	} {
		this._clearExpiredTokens();

		const match = this._u2fTokens.get(token);
		if (!match) {
			return {
				isValid: false,
				type: null,
				request: null
			};
		}

		const isValid = match.instance === instance;
		if (isValid) {
			this._u2fTokens.delete(token);
			return {
				isValid: true as true,
				type: match.type,
				request: match.request
			} as {
				isValid: true;
				type: 'disable'|'verify'|'enable';
				request: U2FRequest;
			}
		}
		return {
			isValid: false,
			type: null,
			request: null
		}
	}
}