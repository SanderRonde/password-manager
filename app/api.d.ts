import { StringifiedObjectId, EncryptedInstance, MasterPassword, EncryptedPassword, InstancePublicKey, ResetKey, ServerPublicKey, ServerPrivateKey } from "./database/db-types";
import { Hashed, Padded, MasterPasswordVerificationPadding, EncryptionAlgorithm, MasterPasswordDecryptionpadding, Encrypted } from "./lib/crypto";
import { UnstringifyObjectIDs } from "./database/libs/db-manipulation";

export interface APIFns {
	'/api/instance/register': typeof APIRoutes.Instance.register;
	'/api/instance/login': typeof APIRoutes.Instance.login;
	'/api/instance/logout': typeof APIRoutes.Instance.logout;
	'/api/instance/extend_key': typeof APIRoutes.Instance.extendKey;

	'/api/instance/2fa/enable': typeof APIRoutes.Instance.Twofactor.enable;
	'/api/instance/2fa/disable': typeof APIRoutes.Instance.Twofactor.disable;
	'/api/instance/2fa/confirm': typeof APIRoutes.Instance.Twofactor.confirm;
	'/api/instance/2fa/verify': typeof APIRoutes.Instance.Twofactor.verify;

	'/api/password/set': typeof APIRoutes.Password.set;
	'/api/password/update': typeof APIRoutes.Password.update;
	'/api/password/remove': typeof APIRoutes.Password.remove;
	'/api/password/get': typeof APIRoutes.Password.get;
	'/api/password/getmeta': typeof APIRoutes.Password.getmeta;
	'/api/password/querymeta': typeof APIRoutes.Password.querymeta;
	'/api/password/allmeta': typeof APIRoutes.Password.allmeta;

	'/api/user/reset': typeof APIRoutes.Account.reset;
	'/api/user/undoreset': typeof APIRoutes.Account.undoreset;
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
export type GetOptionalEncrypted<T> = T extends (arg1: any, arg2: any, arg3: any, arg4: infer R) => void ? R : any;

export const enum API_ERRS {
	INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
	NO_REQUEST_BODY = 'NO_REQUEST_BODY',
	MISSING_PARAMS = 'MISSING_PARAMS',
	INVALID_PARAM_TYPES = 'INVALID_PARAM_TYPES',
	SERVER_ERROR = 'SERVER_ERROR'
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
		export function register(params: {
			email: string;
			public_key: string;
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			id: Encrypted<EncodedString<StringifiedObjectId<EncryptedInstance>>, InstancePublicKey, 'RSA'>
			server_key: Encrypted<EncodedString<ServerPublicKey>, InstancePublicKey, 'RSA'>;
		}>;

		export function login<C extends string>(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
			challenge: Encrypted<EncodedString<C>, ServerPrivateKey>;
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			twofactor_required: boolean;
			twofactor_auth_token: string;	
			challenge: C;
		}>;

		export function logout(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
			token: string;
		}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{}>;

		export function extendKey(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
			oldToken: string;
		}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			auth_token: string;
		}>;

		export namespace Twofactor {
			export function enable(params: {
				instance_id: StringifiedObjectId<EncryptedInstance>;
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
				email: string;
			}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{
				message: 'state unchanged (was already set)'
			}|{
				enabled: false;
				verify_2fa_required: true;
				auth_url: string;	
			}|{
				enabled: true;	
			}>;

			export function disable(params: {
				instance_id: StringifiedObjectId<EncryptedInstance>;
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
				email: string;
				twofactor_token: string;
			}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{
				message: 'state unchanged (was already set)';
			}|{
				disabled: true;	
			}>;

			export function confirm(params: {
				instance_id: StringifiedObjectId<EncryptedInstance>;
				twofactor_token: string;
			}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{}>;

			export function verify(params: {
				instance_id: StringifiedObjectId<EncryptedInstance>;
				twofactor_token: string;
				pw_verification_token: string;
			}, encrypted: {}, optional: {}, optionalEncrypted: {}): JSONResponse<{
				auth_token: string;
			}>;
		}
	}

	export namespace Password {
		export function set(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			websites: string[];
			twofactor_enabled: boolean;
			encrypted: {
				data: Encrypted<EncodedString<{
					username: string;
					password: string;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{}>;

		export function update(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, optional: {}, optionalEncrypted: {
			websites: string[];
			twofactor_enabled: boolean;
			twofactor_token: string;
			encrypted: {
				data: Encrypted<EncodedString<{
					username: string;
					password: string;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}
		}): JSONResponse<{}>;

		export function remove(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, optional: {}, optionalEncrypted: {
			twofactor_token: string;
		}): JSONResponse<{}>;

		export function get(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}, optional: {}, optionalEncrypted: {
			twofactor_token: string;
		}): JSONResponse<{
			encrypted: Encrypted<EncodedString<EncodedString<{
				id: StringifiedObjectId<UnstringifyObjectIDs<EncryptedPassword>>;
				encrypted: {
					data: Encrypted<EncodedString<{
						username: string;
						password: string;
						notes: string[];
					}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
					algorith: EncryptionAlgorithm;
				}
			}>>, InstancePublicKey, 'RSA'>;
		}>;

		export function getmeta<P extends StringifiedObjectId<EncryptedPassword>> (params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_id: P;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			encrypted: Encrypted<EncodedString<EncodedString<{
				id: P;
				websites: {
					host: string;
					exact: string;
				}[];
				twofactor_enabled: boolean;
			}>>, InstancePublicKey, 'RSA'>;
		}>;

		export function allmeta(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			encrypted: Encrypted<EncodedString<EncodedString<{
				id: StringifiedObjectId<UnstringifyObjectIDs<EncryptedPassword>>;
				websites: {
					host: string;
					exact: string;
				}[];
				twofactor_enabled: boolean;
			}[]>>, InstancePublicKey>;
		}>;

		export function querymeta(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			url: string;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			encrypted: Encrypted<EncodedString<EncodedString<{
				id: StringifiedObjectId<UnstringifyObjectIDs<EncryptedPassword>>;
				websites: {
					host: string;
					exact: string;
				}[];
				twofactor_enabled: boolean;
			}[]>>, InstancePublicKey, 'RSA'>;
		}>;
	}

	export namespace Account {
		export function reset(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			reset_key: string;
			email: string;
			newmasterpassword: MasterPassword;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			new_reset_key: ResetKey;
		}>;

		export function undoreset(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			reset_key: string;
			email: string
			master_password: MasterPassword;
			newmasterpassword: MasterPassword;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			new_reset_key: ResetKey;
		}>;

		export function regenkey(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			master_password: MasterPassword;
		}, optional: {}, optionalEncrypted: {}): JSONResponse<{
			new_reset_key: ResetKey;
		}>;
	}
}