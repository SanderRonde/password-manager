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
	[P in keyof APIFns]: [GetArg1<APIFns[P]>, GetArg2<APIFns[P]>];
}

export type APIReturns = {
	[P in keyof APIFns]: ReturnType<APIFns[P]>;
}

export type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any;
export type GetArg1<T> = T extends (arg: infer R) => void ? R : any;
export type GetArg2<T> = T extends (arg1: any, arg: infer R) => void ? R : void;

export const enum API_ERRS {
	INVALID_CREDENTIALS,
	NO_REQUEST_BODY,
	MISSING_PARAMS,
	INVALID_PARAM_TYPES,
	SERVER_ERROR
}

export type JSONResponse<S> = {
	success: true;
	data: S;
}|{
	success: false;
	error: API_ERRS;
}

export declare namespace APIRoutes {
	export namespace Instance {
		export function register(params: {
			email: string;
			public_key: string;
			password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}): JSONResponse<{
			id: Encrypted<EncodedString<StringifiedObjectId<EncryptedInstance>>, InstancePublicKey>
			server_key: Encrypted<EncodedString<ServerPublicKey>, InstancePublicKey>;
		}>;

		export function login<C extends string>(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
			challenge: Encrypted<EncodedString<C>, ServerPrivateKey>;
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}): JSONResponse<{
			twofactor_required: boolean;
			twofactor_auth_token: string;	
			challenge: C;
		}>;

		export function logout(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
			token: string;
		}): JSONResponse<{}>;

		export function extendKey(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
			oldToken: string;
		}): JSONResponse<{
			auth_token: string;
		}>;

		export namespace Twofactor {
			export function enable(params: {
				instance_id: StringifiedObjectId<EncryptedInstance>;
				password: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
				email: string;
			}): JSONResponse<{
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
			}): JSONResponse<{
				message: 'state unchanged (was already set)';
			}|{
				disabled: true;	
			}>;

			export function confirm(params: {
				instance_id: StringifiedObjectId<EncryptedInstance>;
				twofactor_token: string;
			}): JSONResponse<{}>;

			export function verify(params: {
				instance_id: StringifiedObjectId<EncryptedInstance>;
				twofactor_token: string;
				pw_verification_token: string;
			}): JSONResponse<{
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
		}): JSONResponse<{}>;

		export function update(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}): JSONResponse<{}>;

		export function remove(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;
		}): JSONResponse<{}>;

		export function get(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_id: StringifiedObjectId<EncryptedPassword>;
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
			}>>, InstancePublicKey>;
		}>;

		export function getmeta<P extends StringifiedObjectId<EncryptedPassword>> (params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_id: P;
		}): JSONResponse<{
			encrypted: Encrypted<EncodedString<EncodedString<{
				id: P;
				websites: {
					host: string;
					exact: string;
				}[];
				twofactor_enabled: boolean;
			}>>, InstancePublicKey>;
		}>;

		export function allmeta(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			token: string;
			password_hash: Hashed<Padded<MasterPassword, MasterPasswordVerificationPadding>>;
		}): JSONResponse<{
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
		}): JSONResponse<{
			encrypted: Encrypted<EncodedString<EncodedString<{
				id: StringifiedObjectId<UnstringifyObjectIDs<EncryptedPassword>>;
				websites: {
					host: string;
					exact: string;
				}[];
				twofactor_enabled: boolean;
			}[]>>, InstancePublicKey>;
		}>;
	}

	export namespace Account {
		export function reset(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			reset_key: string;
			email: string;
			newmasterpassword: MasterPassword;
		}): JSONResponse<{
			new_reset_key: ResetKey;
		}>;

		export function undoreset(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			reset_key: string;
			email: string
			master_password: MasterPassword;
			newmasterpassword: MasterPassword;
		}): JSONResponse<{
			new_reset_key: ResetKey;
		}>;

		export function regenkey(params: {
			instance_id: StringifiedObjectId<EncryptedInstance>;
		}, encrypted: {
			master_password: MasterPassword;
		}): JSONResponse<{
			new_reset_key: ResetKey;
		}>;
	}
}