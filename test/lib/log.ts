import { Log } from '../../app/main';

export class LogDataRegex extends RegExp { }

export const enum LOG_DATA {
	ANY_STRING,
	ANY_VALUE,
	ANY_AND_FOLLOWING
}

export class LogCapturer implements Log {
	private _expectedLogs: {
		content: (any|LOG_DATA|LogDataRegex)[];
		resolve(): void;
		reject(error: Error): void;
	}[] = [];
	private _readQueue: {
		question: string;
		answer: string;
		resolve(): void;
		reject(error: Error): void;
	}[] = [];
	private _ignoreLogs = false;

	constructor(private _genericReject: (err: Error) => void) {}

	read(text: string): Promise<string> {
		return new Promise((resolveRead) => {
			if (this._readQueue.length === 0) {
				this._genericReject(new Error('Value was read but none is available'));
				resolveRead('');
			} else {
				const { question, answer, reject, resolve } = this._readQueue[0];
				if (text !== question) {
					reject(new Error(`Expected question "${question}" but got "${text}"`));
					resolveRead('');
					return;
				}
				resolveRead(answer);
				resolve();
			}
		});
	}

	private _areEqual(val1: any, val2: any): boolean {
		if (typeof val1 === 'string' && typeof val2 === 'string') {
			return val1.trim() === val2.trim();
		} else if (typeof val1 === 'string' || typeof val2 === 'string') {
			return false;
		} else {
			return JSON.stringify(val1) === JSON.stringify(val2);
		}
	}

	private _checkLog(actual: any[], expected: (any|LOG_DATA|LogDataRegex)[], reject: (err: Error) => void) {
		if (actual.length !== expected.length && 
			expected[expected.length - 1] !== LOG_DATA.ANY_AND_FOLLOWING) {
				if (actual.length > expected.length) {
					reject(new Error(`Too many logs received "${
						actual.slice(expected.length).map(val => val.toString()).join(', ')
					}"`));
				} else {
					reject(new Error(`Too few logs received "${
						expected.slice(actual.length).map(val => val.toString()).join(', ')
					}"`));
				}
				return false;
			}

		for (let i = 0; i < expected.length; i++) {
			const actualLog = actual[i];
			const expectedLog = expected[i];
			if (expectedLog instanceof LogDataRegex) {
				if (!expectedLog.exec(actualLog)) {
					reject(new Error(`Expected "${expectedLog.toString()}" but got "${
						actualLog.toString()
					}"`));
				}
			}
			switch (expectedLog) {
				case LOG_DATA.ANY_STRING:
					if (typeof actualLog !== 'string') {
						reject(new Error(`Expected string but got "${actualLog.toString()}"`))
						return false;
					}
					break;
				case LOG_DATA.ANY_VALUE:
					break;
				case LOG_DATA.ANY_AND_FOLLOWING:
					return true;
				default:
					if (!this._areEqual(actualLog, expectedLog)) {
						reject(new Error(`Expected "${
							expectedLog.toString()}" but got "${actualLog.toString()}"`))
					}
			}
		}
		return true;
	}

	write(...args: any[]) {
		if (this._ignoreLogs) {
			return;
		}
		if (!this._expectedLogs[0]) {
			this._genericReject(new Error(`Unexpected log ${
				args.map(arg => arg.toString()).join(', ')}`));
			return;
		}
		const { content, reject, resolve } = this._expectedLogs[0];
		if (this._checkLog(args, content, reject)) {
			resolve();
		}
		this._expectedLogs.shift();
	}

	expectWrite(...args: (any|LOG_DATA)[]): Promise<void> {
		return new Promise((resolve, reject) => {
			this._expectedLogs.push({
				content: args,
				resolve,
				reject
			});
		});
	}

	ignoreLogs() {
		this._ignoreLogs = true;
	}

	expectRead(question: string, answer: string): Promise<void> {
		return new Promise((resolve, reject) => {
			this._readQueue.push({
				question, answer, resolve, reject
			});
		});
	}

	finalize() {
		return new Promise((resolve, reject) => {
			if (this._readQueue.length > 0) {
				reject(new Error('Read queue is not empty'));
				return;
			}
			if (this._expectedLogs.length > 0) {
				reject(new Error(`Expected log ${
					this._expectedLogs[0].content.map(val => val.toString()).join(', ')
				}`));
				return;
			}
			resolve();
		});
	}
}

export class ExitCodeCapturer {
	private _expectedCodes: number[] = [];
	private _active: boolean = true;

	constructor(private _genericReject: (err: Error) => void) {}

	onExit(code: number) {
		if (!this._active) {
			return;
		}
		if (!(0 in this._expectedCodes)) {
			this._genericReject(new Error('Exit was called but none expected'));
			return;
		}
		const expectedCode = this._expectedCodes[0];
		this._expectedCodes.shift();
		if (expectedCode !== code) {
			this._genericReject(new Error(`Expected exit code ${
				expectedCode} but got ${code}`));
			return;
		}
	}

	expect(code: number) {
		this._expectedCodes.push(code);
	}
	
	finalize() {
		return new Promise((resolve, reject) => {
			this._active = false;

			if (this._expectedCodes.length > 0) {
				reject(new Error(`Finalizing while still expecting code ${
					this._expectedCodes[0]	
				}${
					this._expectedCodes.length > 1 ? 'and others' : ''	
				}`));
				return;
			}
			resolve();
		});
	}
}