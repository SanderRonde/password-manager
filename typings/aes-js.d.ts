declare module "aes-js" {
	type Bytes<T> = Uint8Array & {
		__data: T;
	}

	class ctr {
		constructor(key: Bytes<string>, counter?: Counter);
		encrypt(data: Uint8Array): Uint8Array;
		decrypt(data: Uint8Array): Uint8Array;
	}

	class cbc {
		constructor(key: Bytes<string>, iv?: {
			[key: number]: number;
			length: 16;
		});
		encrypt(data: Uint8Array): Uint8Array;
		decrypt(data: Uint8Array): Uint8Array;
	}

	class cfb {
		constructor(key: Bytes<string>, iv?: {
			[key: number]: number;
			length: 16;
		}, segmentSize?: number);
		encrypt(data: Uint8Array): Uint8Array;
		decrypt(data: Uint8Array): Uint8Array;
	}

	class ofb {
		constructor(key: Bytes<string>, iv?: {
			[key: number]: number;
			length: 16;
		});
		encrypt(data: Uint8Array): Uint8Array;
		decrypt(data: Uint8Array): Uint8Array;
	}

	class ecb {
		constructor(key: Bytes<string>);
		encrypt(data: Uint8Array): Uint8Array;
		decrypt(data: Uint8Array): Uint8Array;
	}

	export const ModeOfOperation: {
		ctr: typeof ctr;
		cbc: typeof cbc;
		cfb: typeof cfb;
		ofb: typeof ofb;
		ecb: typeof ecb;
	}

	export class Counter {
		constructor(number: number);
	}

	export const utils: {
		utf8: {
			toBytes<T>(text: T): Bytes<T>;
			fromBytes<T>(bytes: number[]): string;
			fromBytes<T>(bytes: Bytes<T>): T;
			fromBytes<T>(bytes: Bytes<T>|number[]): T|string;
		}
		hex: {
			toBytes<T>(text: T): Bytes<T>;
			fromBytes<T>(bytes: number[]): string;
			fromBytes<T>(bytes: Bytes<T>): T;
			fromBytes<T>(bytes: Bytes<T>|number[]): T|string;
		}
	}

	export class AES {
		constructor(key: Bytes<string>);
		encrypt(data: Uint8Array): Uint8Array;
		decrypt(data: Uint8Array): Uint8Array;
	}

	export const padding: {
		pkcs7: {
			pad(input: Uint8Array): Uint8Array;
			strip(input: Uint8Array): Uint8Array;
		}
	}
}