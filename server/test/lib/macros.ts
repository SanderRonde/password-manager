import { GetRequired, GetOptional, GetEncrypted, GetOptionalEncrypted, APIFns, API_ERRS, APIArgs, JSONResponse } from "../../app/api";
import { RegisterContextual, GenericTestContext, Context } from "ava";
import { doServerAPIRequest, genUserAndDb, createServer } from "./util";
import { ChildProcess } from "child_process";

async function doServerSetupAndBreakdown(t: GenericTestContext<Context<any>>, uris: string[]) {
	const config = await genUserAndDb(t);
	const server = await createServer({...config });
	uris.push(config.uri);
	return {
		done() {
			server.kill();
		},
		config
	}
}

function getFillerType(keyType: 'string'|'boolean'|'number'|'array') {
	switch (keyType) {
		case 'string':
			return 'string';
		case 'boolean':
			return false;
		case 'number':
			return 0;
		case 'array':
			return [];
	}
}

function getWrongType(keyType: 'string'|'boolean'|'number'|'array') {
	switch (keyType) {
		case 'string':
			return false;
		case 'boolean':
			return 'string';
		case 'number':
			return [];
		case 'array':
			return 0;
	}
}

function mapObj<T extends Object, R>(obj: T, fn: (key: keyof T, val: T[keyof T]) => R): {
	[P in keyof T]: R;
} {
	const newObj: Partial<{
		[P in keyof T]: R;
	}> = {};
	for (const key in obj) {
		newObj[key] = fn(key, obj[key]);
	}
	return newObj as {
		[P in keyof T]: R;
	};
}

export function testParams<R extends keyof APIFns>(test: RegisterContextual<any>, uris: string[], route: R, required: {
	[key in keyof GetRequired<APIFns[R]>]: 'string'|'boolean'|'number'|'array';
}, optional: {
	[key in keyof GetOptional<APIFns[R]>]: 'string'|'boolean'|'number'|'array';
}, encrypted: {
	[key in keyof GetEncrypted<APIFns[R]>]: 'string'|'boolean'|'number'|'array';
}, optionalEncrypted: {
	[key in keyof GetOptionalEncrypted<APIFns[R]>]: 'string'|'boolean'|'number'|'array';
}) {
	// Test missing params
	test(`no params for route "${route}"`, async t => {
		const { config, done } = await doServerSetupAndBreakdown(t, uris);
		const response = JSON.parse(await doServerAPIRequest({
			port: config.http,
			publicKey: config.server_public_key
		}, route, {} as any)) as {
			success: false;
			ERR: API_ERRS;
		};
		t.false(response.success, 'request failed');
		t.is(response.ERR, API_ERRS.MISSING_PARAMS, 'MISSING_PARAMS error is thrown');
		done();
	});

	//Missing a single unencrypted param
	for (const missingKey in required) {
		test(`missing unencrypted param "${missingKey}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs: Partial<{
				[key in keyof GetRequired<APIFns[R]>]: any;
			}> = {};
			const encryptedArgs: {
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			} = mapObj(encrypted, (_, val) => getFillerType(val));
			for (const key in required) {
				if (key !== missingKey) {
					unencryptedArgs[key] = getFillerType(required[key]);
				}
			}
			const response = JSON.parse(await doServerAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...(missingKey === 'instance_id' ? {} : {
				instance_id: config.instance_id
			})}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.MISSING_PARAMS, 'MISSING_PARAMS error is thrown');
			done();
		});
	}

	//Missing a single encrypted param
	for (const missingKey in encrypted) {
		test(`missing encrypted param "${missingKey}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs: {
				[key in keyof GetRequired<APIFns[R]>]: any;
			} = mapObj(required, (_, val) => getFillerType(val));
			const encryptedArgs: Partial<{
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			}> = {};
			for (const key in encrypted) {
				if (key !== missingKey) {
					encryptedArgs[key] = getFillerType(encrypted[key]);
				}
			}
			const response = JSON.parse(await doServerAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...{
				instance_id: config.instance_id
			}}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.MISSING_PARAMS, 'MISSING_PARAMS error is thrown');
			done();
		});
	}

	//Wrong unencrypted required types
	for (const wrongType in required) {
		if (wrongType === 'instance_id') continue;
		test(`wrong type for unencrypted required param "${wrongType}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs = {
				[wrongType]: getWrongType(required[wrongType])
			} as Partial<{
				[key in keyof GetRequired<APIFns[R]>]: any;
			}>;
			const encryptedArgs: Partial<{
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			}> = mapObj(encrypted, (_, val) => getFillerType(val));
			for (const key in required) {
				if (key !== wrongType) {
					unencryptedArgs[key] = getFillerType(required[key]);
				}
			}
			const response = JSON.parse(await doServerAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...(wrongType === 'instance_id' ? {} : {
				instance_id: config.instance_id
			})}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.INVALID_PARAM_TYPES, 'INVALID_PARAM_TYPES error is thrown');
			done();
		});
	}

	//Wrong encrypted required types
	for (const wrongType in encrypted) {
		test(`wrong type for encrypted required param "${wrongType}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs: {
				[key in keyof GetRequired<APIFns[R]>]: any;
			} = mapObj(required, (_, val) => getFillerType(val));
			const encryptedArgs = {
				[wrongType]: getWrongType(encrypted[wrongType])
			} as Partial<{
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			}>;
			for (const key in encrypted) {
				if (key !== wrongType) {
					encryptedArgs[key] = getFillerType(encrypted[key]);
				}
			}
			const response = JSON.parse(await doServerAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...{
				instance_id: config.instance_id
			}}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.INVALID_PARAM_TYPES, 'INVALID_PARAM_TYPES error is thrown');
			done();
		});
	}

	//Wrong unencrypted optional types
	for (const wrongType in optional) {
		test(`wrong type for unencrypted optional param "${wrongType}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs = {...mapObj(required, (_, val) => getFillerType(val)) as object, ...{
				[wrongType]: getWrongType(optional[wrongType])
			}} as {
				[key in keyof GetRequired<APIFns[R]>]: any;
			};
			const encryptedArgs: {
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			} = mapObj(encrypted, (_, val) => getFillerType(val));
			const response = JSON.parse(await doServerAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...{
				instance_id: config.instance_id
			}}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.INVALID_PARAM_TYPES, 'INVALID_PARAM_TYPES error is thrown');
			done();
		});
	}

	//Wrong encrypted optional types
	for (const wrongType in optionalEncrypted) {
		test(`wrong type for encrypted optional param "${wrongType}"`, async t => {
			const { config, done } = await doServerSetupAndBreakdown(t, uris);
			const unencryptedArgs = mapObj(required, (_, val) => getFillerType(val)) as {
				[key in keyof GetRequired<APIFns[R]>]: any;
			};
			const encryptedArgs = {...mapObj(encrypted, (_, val) => getFillerType(val)) as object, ...{
				[wrongType]: getWrongType(optionalEncrypted[wrongType])
			}} as {
				[key in keyof GetEncrypted<APIFns[R]>]: any;
			};
			const response = JSON.parse(await doServerAPIRequest({
				port: config.http,
				publicKey: config.server_public_key
			}, route, {...unencryptedArgs as any, ...{
				instance_id: config.instance_id
			}}, encryptedArgs)) as {
				success: false;
				ERR: API_ERRS;
			};
			t.false(response.success, 'request failed');
			t.is(response.ERR, API_ERRS.INVALID_PARAM_TYPES, 'INVALID_PARAM_TYPES error is thrown');
			done();
		});
	}
}

export async function testInvalidCredentials<R extends keyof APIFns, 
	U extends APIArgs[R][0], E extends APIArgs[R][1]>(t: GenericTestContext<Context<any>>, {
	port, unencrypted, encrypted, route, server, publicKey, err = API_ERRS.INVALID_CREDENTIALS
}: {
	publicKey: string;
	port: number;
	route: R;
	unencrypted: U;
	encrypted?: E;
	server: ChildProcess;
	err?: API_ERRS
}) {
	const response = JSON.parse(await doServerAPIRequest({ 
		port: port,
		publicKey: publicKey
	}, route, 
		unencrypted, encrypted!)) as JSONResponse<any>;

	server.kill();

	t.false(response.success, 'API call failed');
	if (response.success) {
		return;
	}
	t.is(response.ERR, err,
		'got invalid credentials errors');
}