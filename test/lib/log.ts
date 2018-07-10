import { Log } from '../../app/main';
import { assert } from 'chai';

export class LogDataRegex extends RegExp { }

export const enum LOG_DATA {
	ANY_STRING,
	ANY_VALUE,
	ANY_AND_FOLLOWING
}

export class LogCapturer implements Log {
	private _expectedLogs: {
		content: (any|LOG_DATA|LogDataRegex)[];
	}[] = [];
	private _receivedLogs: {
		content: any[];
	}[] = [];
	private _readQueue: {
		question: string;
		answer: string;
	}[] = [];
	private _ignoreLogs = false;

	constructor() {}

	read(text: string): Promise<string> {
		assert.isAtLeast(this._readQueue.length, 1,
			`Read queue is empty (while reading "${text}"`);

		const { question, answer } = this._readQueue[0];
		assert.strictEqual(text, question,
			'Question is the same as expected');
		return Promise.resolve(answer);
	}

	private _assertEqual(actual: any, expected: any) {
		if (typeof actual === 'string' && typeof expected === 'string') {
			assert.strictEqual(actual.trim(), expected.trim(),
				'values are the same');
		} else {
			assert.strictEqual(actual, expected,
				'values are the same');
		}
	}

	private _checkLog(actual: any[], expected: (any|LOG_DATA|LogDataRegex)[]) {
		assert.lengthOf(actual, expected.length,
			'Log lengths are the same');

		for (let i = 0; i < expected.length; i++) {
			const actualLog = actual[i];
			const expectedLog = expected[i];
			if (expectedLog instanceof LogDataRegex) {
				assert.match(actualLog, expectedLog,
					'Value matches regex');
			}
			switch (expectedLog) {
				case LOG_DATA.ANY_STRING:
					assert.typeOf(actualLog, 'string', 
						'Log is of type string');
					break;
				case LOG_DATA.ANY_VALUE:
					break;
				case LOG_DATA.ANY_AND_FOLLOWING:
					return;
				default:
					this._assertEqual(actualLog, expectedLog);
			}
		}
	}

	write(...args: any[]) {
		if (this._ignoreLogs) {
			return;
		}
		this._receivedLogs.push({
			content: args
		});
	}

	expectWrite(...args: (any|LOG_DATA)[]) {
		this._expectedLogs.push({
			content: args
		});
	}

	ignoreLogs() {
		this._ignoreLogs = true;
	}

	expectRead(question: string, answer: string) {
		this._readQueue.push({
			question, answer
		});
	}

	finalize() {
		for (const { content: args } of this._receivedLogs) {
			assert.exists(this._expectedLogs[0], 
				`A log is in the expected queue (when reading "${
					args.map(arg => arg.toString()).join(', ')
				}")`);
			const { content } = this._expectedLogs[0];
			this._checkLog(args, content)
			this._expectedLogs.shift();
		}

		assert.lengthOf(this._expectedLogs, 0,
			`Expected queue is empty (contains "${
				(this._expectedLogs[0] || {
					content: []
				}).content.map(val => val.toString()).join(', ')
			}"`);
	}
}

export class ExitCodeCapturer {
	private _expectedCodes: number[] = [];
	private _receivedCodes: number[] = [];
	private _active: boolean = true;

	constructor() {}

	onExit(code: number = 0) {
		if (!this._active) {
			return;
		}
		this._receivedCodes.push(code);
	}

	expect(code: number) {
		this._expectedCodes.push(code);
	}
	
	finalize() {
		this._active = false;

		for (const code of this._receivedCodes) {
			assert.exists(this._expectedCodes[0], 'An exit code was expected');

			const expectedCode = this._expectedCodes[0];
			this._expectedCodes.shift();
			assert.strictEqual(code, expectedCode, 
				'Exit code is the same as expected');
		}

		assert.lengthOf(this._expectedCodes, 0,
			`Expected queue is empty (still expecting "${
				this._expectedCodes.join(',')
			}"`);
	}
}