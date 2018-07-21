import { StringifiedObjectId, EncryptedInstance, MasterPassword, EncryptedPassword, InstancePublicKey, ResetKey, ServerPublicKey, ServerPrivateKey, RSAEncrypted } from "./database/db-types";
import { Hashed, Padded, MasterPasswordVerificationPadding, EncryptionAlgorithm, MasterPasswordDecryptionpadding, Encrypted } from "./lib/crypto";
import { TwofactorVerifyToken, LoginToken } from "./actions/server/webserver/server/modules/auth";
import { UnstringifyObjectIDs } from "./database/libs/db-manipulation";

export interface APIFns {
	/**
	 * Register a new instance
	 */
	'/api/instance/register': typeof APIRoutes.Instance.register;
	/**
	 * Log in to an instance and get a token that gives temporary API access
	 */
	'/api/instance/login': typeof APIRoutes.Instance.login;
	/**
	 * Log out of an instance. Basically just invalidates the login token
	 */
	'/api/instance/logout': typeof APIRoutes.Instance.logout;
	/**
	 * Extend a login token. Has to happen every 15 minutes
	 */
	'/api/instance/extend_key': typeof APIRoutes.Instance.extendKey;

	/**
	 * Enable 2FA for an instance
	 */
	'/api/instance/2fa/enable': typeof APIRoutes.Instance.Twofactor.enable;
	/**
	 * Disable 2FA for this instance
	 */
	'/api/instance/2fa/disable': typeof APIRoutes.Instance.Twofactor.disable;
	/**
	 * Confirm 2FA for this account
	 */
	'/api/instance/2fa/confirm': typeof APIRoutes.Instance.Twofactor.confirm;
	/**
	 * Verify 2FA when logging in
	 */
	'/api/instance/2fa/verify': typeof APIRoutes.Instance.Twofactor.verify;

	/**
	 * Create a new password
	 */
	'/api/password/set': typeof APIRoutes.Password.set;
	/**
	 * Update individual fields of a password
	 */
	'/api/password/update': typeof APIRoutes.Password.update;
	/**
	 * Remove a password
	 */
	'/api/password/remove': typeof APIRoutes.Password.remove;
	/**
	 * Get a single password
	 */
	'/api/password/get': typeof APIRoutes.Password.get;
	/**
	 * Get metadata only for given password ID
	 */
	'/api/password/getmeta': typeof APIRoutes.Password.getmeta;
	/**
	 * Get the metadata of all passwords
	 */
	'/api/password/querymeta': typeof APIRoutes.Password.querymeta;
	/**
	 * Query passwords for given URL
	 */
	'/api/password/allmeta': typeof APIRoutes.Password.allmeta;

	/**
	 * Reset an account's password
	 */
	'/api/user/reset': typeof APIRoutes.Account.reset;
	/**
	 * Generate a new reset key and invalidate the old one
	 */
	'/api/user/genresetkey': typeof APIRoutes.Account.regenkey;
}

export type APIArgs = {
	[P in keyof APIFns]: [
		GetRequired<APIFns[P]> & Partial<GetOptional<APIFns[P]>>, 
		GetEncrypted<APIFns[P]> & Partial<GetOptionalEncrypted<APIFns[P]>>];
}

export type APIReturns = {
	[P in keyof APIFns]: ReturnType<APIFns[P]>;
}

export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
export type GetRequired<T> = T extends (arg1: infer R, arg2: any, arg3: any, arg4: any) => void ? R : any;
export type GetEncrypted<T> = T extends (arg1: any, arg2: infer R, arg3: any, arg4: any) => void ? R : void;
export type GetOptional<T> = T extends (arg1: any, arg2: any, arg3: infer R, arg4: any) => void ? R : any;
export type GetOptionalEncrypted<T> = T extends (arg1: any, arg2: any, arg3: any, arg4: infer R) => void ? R : void;

export const enum API_ERRS {
	INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
	NO_REQUEST_BODY = 'NO_REQUEST_BODY',
	MISSING_PARAMS = 'MISSING_PARAMS',
	INVALID_PARAM_TYPES = 'INVALID_PARAM_TYPES',
	SERVER_ERROR = 'SERVER_ERROR',
	TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS'
}

export type JSONResponse<S> = {
	success: true;
	data: S;
}|{
	success: false;
	ERR: API_ERRS;
}

export declare namespace APIRoutes {
	export namespace Instance {
		/**
		 * Register a new instance
		 */
		export function register(params: {
			/**
			 * The email address of the user to register it for
			 */
			email: string;
			/**
			 * A public key for the instance, used to encrypt data sent to it
			 */
			public_key: string;
			/**
			 * The master password for the user associated with the email address
			 */
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			/**
			 * The assigned ID of the instance, used to indicate its identity
			 */
			id: RSAEncrypted<EncodedString<StringifiedObjectId<EncryptedInstance>>, InstancePublicKey>
			/**
			 * The public key of the server, used to encrypt data sent to it
			 */
			server_key: RSAEncrypted<EncodedString<ServerPublicKey>, InstancePublicKey>;
		}>;

		/**
		 * Log in to an instance and get a token that gives temporary API access
		 */
		export function login<C extends string>(params: {
			/**
			 * The ID of the instance, assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
			/**
			 * A challenge by the instance to verify the server's identity
			 */
			challenge: RSAEncrypted<EncodedString<C>, ServerPrivateKey>;
		}, encrypted: {
			/**
			 * The hash of the master password
			 */
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			/**
			 * Further 2FA authentication is required
			 */
			twofactor_required: true;
			/**
			 * The token to use when verifying 2FA code, through /api/instance/2fa/verify. 
			 * Encrypted with instance key
			 */
			twofactor_auth_token: RSAEncrypted<EncodedString<TwofactorVerifyToken>, InstancePublicKey>;	
			/**
			 * The solved challenge
			 */
			challenge: C;
		}|{
			/**
			 * Further authentication is not required
			 */
			twofactor_required: false;
			/**
			 * The auth token that can be used to make API requests. Encrypted with instance key
			 */
			auth_token: RSAEncrypted<EncodedString<LoginToken>, InstancePublicKey>;	
			/**
			 * The solved challenge
			 */
			challenge: C;
		}>;

		/**
		 * Log out of an instance. Basically just invalidates the login token
		 */
		export function logout(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
			/**
			 * The login token assigned at login
			 */
			token: LoginToken;
		}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{}>;

		/**
		 * Extend a login token. Has to happen every 15 minutes
		 */
		export function extendKey(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
			/**
			 * The login token assigned at login
			 */
			oldToken: LoginToken;
		}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			/**
			 * The new auth token. Encrypted with instance public key
			 */
			auth_token: RSAEncrypted<EncodedString<LoginToken>, InstancePublicKey>;
		}>;

		export namespace Twofactor {
			/**
			 * Enable 2FA for an instance
			 */
			export function enable(params: {
				/**
				 * The id of the instance assigned at registration
				 */
				instance_id: StringifiedObjectId<EncryptedInstance>;
				/**
				 * The email address associated with the instance
				 */
				email: string;
			}, encrypted: {
				/**
				 * The hashed master password for the user associated with the instance
				 */
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
			}, optional: {}, optionalEncrypted: {}): JSONResponse<{
				/**
				 * A message explaining what happened
				 */
				message: 'state unchanged (was already set)'
			}|{
				/**
				 * It's not enabled because 2FA was not set up for this user
				 */
				enabled: false;
				/**
				 * Further verification is required through /api/instance/2fa/confirm
				 */
				verify_2fa_required: true;
				/**
				 * A URL used to register the 2FA secret
				 */
				auth_url: string;	
			}|{
				/**
				 * It's enabled
				 */
				enabled: true;	
			}>;

			/**
			 * Disable 2FA for this instance
			 */
			export function disable(params: {
				/**
				 * The id of the instance assigned at registration
				 */
				instance_id: StringifiedObjectId<EncryptedInstance>;
				/**
				 * The email address associated with the instance
				 */
				email: string;
				/**
				 * A 2FA token for this account
				 */
				twofactor_token: string;
			}, encrypted: {
				/**
				 * The hashed master password for the user associated with the instance
				 */
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
			}, optional: {}, optionalEncrypted: {}): JSONResponse<{
				/**
				 * A message explaining what happens
				 */
				message: 'state unchanged (was already set)';
			}|{
				/**
				 * 2FA was disabled
				 */
				disabled: true;	
			}>;

			/**
			 * Confirm 2FA for this account
			 */
			export function confirm(params: {
				/**
				 * The id of the instance assigned at registration
				 */
				instance_id: StringifiedObjectId<EncryptedInstance>;
				/**
				 * A 2FA token matching the expected secret
				 */
				twofactor_token: string;
			}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{}>;

			/**
			 * Verify 2FA when logging in
			 */
			export function verify(params: {
				/**
				 * The id of the instance assigned at registration
				 */
				instance_id: StringifiedObjectId<EncryptedInstance>;
				/**
				 * A 2FA token for this account
				 */
				twofactor_token: string;
				/**
				 * The token passed along
				 */
				pw_verification_token: TwofactorVerifyToken;
			}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{
				/**
				 * A login token that can be used for the /api/password API
				 */
				auth_token: RSAEncrypted<EncodedString<LoginToken>, InstancePublicKey>;
			}>;
		}
	}

	export namespace Password {
		/**
		 * Create a new password
		 */
		export function set(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			/**
			 * An auth token
			 */
			token: LoginToken;
			/**
			 * The websites for which this password works
			 */
			websites: string[];
			/**
			 * Whether 2FA should be enabled for this password
			 */
			twofactor_enabled: boolean;
			/**
			 * Encrypted data
			 */
			encrypted: EncodedString<{
				/**
				 * The actual data
				 */
				data: Encrypted<EncodedString<{
					/**
					 * The username for this website
					 */
					username: string;
					/**
					 * The password for this website
					 */
					password: string;
					/**
					 * Any secure notes
					 */
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				/**
				 * The used algorithm
				 */
				algorithm: EncryptionAlgorithm;
			}>;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			id: StringifiedObjectId<EncryptedPassword>;
		}>;

		/**
		 * Update individual fields of a password
		 */
		export function update(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			/**
			 * The auth token
			 */
			token: LoginToken;
			/**
			 * The ID of the password to update
			 */
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, optional: {}, optionalEncrypted: {
			/**
			 * The websites for which this password works
			 */
			websites: string[];
			/**
			 * Whether 2FA should be enabled for this password
			 */
			twofactor_enabled: boolean;
			/**
			 * A twofactor token. Only required if 2FA is enabled for this password
			 */
			twofactor_token: string;
			/**
			 * Encrypted data
			 */
			encrypted: EncodedString<{
				/**
				 * The actual data
				 */
				data: Encrypted<EncodedString<{
					/**
					 * The username for this website
					 */
					username: string;
					/**
					 * The password for this website
					 */
					password: string;
					/**
					 * Any secure notes
					 */
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				/**
				 * The used algorithm
				 */
				algorithm: EncryptionAlgorithm;
			}>;
		}): JSONResponse<{}>;

		/**
		 * Remove a password
		 */
		export function remove(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			/**
			 * An auth token
			 */
			token: LoginToken;
			/**
			 * The id of the password
			 */
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, optional: {}, optionalEncrypted: {
			/**
			 * A 2FA token. Only required if 2FA was enabled for this password
			 */
			twofactor_token: string;
		}): JSONResponse<{}>;

		/**
		 * Get a single password
		 */
		export function get(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			/**
			 * An auth token
			 */
			token: LoginToken;
			/**
			 * The id of the password
			 */
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, optional: {}, optionalEncrypted: {
			/**
			 * A 2FA token, only required if 2FA is enabled for this password
			 */
			twofactor_token: string;
		}): JSONResponse<{
			/**
			 * The password data. Encrypted with instance public key and user password
			 */
			encrypted: RSAEncrypted<EncodedString<EncodedString<{
				id: StringifiedObjectId<UnstringifyObjectIDs<EncryptedPassword>>;
				encrypted: EncodedString<{
					/**
					 * The encrypted data
					 */
					data: Encrypted<EncodedString<{
						/**
						 * The username of the website (or group)
						 */
						username: string;
						/**
						 * The password of the website (or group)
						 */
						password: string;
						/**
						 * Any notes about this website (or group)
						 */
						notes: string[];
					}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
					/**
					 * The algorithm used to encrypt the data
					 */
					algorithm: EncryptionAlgorithm;
				}>;
			}>>, InstancePublicKey>;
		}>;

		/**
		 * Get metadata only for given password ID
		 */
		export function getmeta<P extends StringifiedObjectId<EncryptedPassword>> (params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			/**
			 * An auth token
			 */
			token: LoginToken;
			/**
			 * The password ID
			 */
			password_id: P;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			/**
			 * Encrypted data
			 */
			encrypted: RSAEncrypted<EncodedString<EncodedString<{
				/**
				 * The ID of the password
				 */
				id: P;
				/**
				 * The websites for which this password ID works
				 */
				websites: {
					/**
					 * The hostname of the URL
					 */
					host: string;
					/**
					 * The exact URL
					 */
					exact: string;
				}[];
				/**
				 * Whether 2FA is enabled for this instance
				 */
				twofactor_enabled: boolean;
			}>>, InstancePublicKey>;
		}>;

		/**
		 * Get the metadata of all passwords
		 */
		export function allmeta(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			/**
			 * An auth token
			 */
			token: LoginToken;
			/**
			 * The master password hash
			 */
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			/**
			 * Data enrypted with the instance's public key
			 */
			encrypted: RSAEncrypted<EncodedString<EncodedString<{
				/**
				 * The ID of the password
				 */
				id: StringifiedObjectId<UnstringifyObjectIDs<EncryptedPassword>>;
				/**
				 * The websites for which this password works
				 */
				websites: {
					/**
					 * The hostname of the URL
					 */
					host: string;
					/**
					 * The exact URL
					 */
					exact: string;
				}[];
				/**
				 * Whether 2Fa is enabled for this password
				 */
				twofactor_enabled: boolean;
			}[]>>, InstancePublicKey>;
		}>;

		/**
		 * Query passwords for given URL
		 */
		export function querymeta(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			/**
			 * An auth token
			 */
			token: LoginToken;
			/**
			 * The URL to look for
			 */
			url: string;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			/**
			 * Data enrypted with the instance's public key
			 */
			encrypted: RSAEncrypted<EncodedString<EncodedString<{
				/**
				 * The ID of the password
				 */
				id: StringifiedObjectId<UnstringifyObjectIDs<EncryptedPassword>>;
				/**
				 * The websites for which this password works
				 */
				websites: {
					/**
					 * The hostname of the URL
					 */
					host: string;
					/**
					 * The exact URL
					 */
					exact: string;
				}[];
				/**
				 * Whether 2Fa is enabled for this password
				 */
				twofactor_enabled: boolean;
			}[]>>, InstancePublicKey>;
		}>;
	}

	export namespace Account {
		/**
		 * Reset an account's password
		 */
		export function reset(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			/**
			 * The reset key for this account
			 */
			reset_key: string;
			/**
			 * The email address associated with this account
			 */
			email: string;
			/**
			 * The new master password in plain text
			 */
			newmasterpassword: MasterPassword;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			/**
			 * The new reset key
			 */
			new_reset_key: ResetKey;
		}>;

		/**
		 * Generate a new reset key and invalidate the old one
		 */
		export function regenkey(params: {
			/**
			 * The id of the instance assigned at registration
			 */
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			/**
			 * The reset key for this account
			 */
			reset_key: string;
			/**
			 * The user's master password in plaintext
			 */
			master_password: MasterPassword;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			/**
			 * The new reset key
			 */
			new_reset_key: ResetKey;
		}>;
	}
}