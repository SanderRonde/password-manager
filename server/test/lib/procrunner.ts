import { spawn, ChildProcess } from "child_process";
import { listenWithoutRef } from "./util";
import { assert } from 'chai';
import * as path from 'path'

export enum LOG_VALS {
	ANY_STRING = 0
}

function isLogVal(value: any): value is LOG_VALS {
	return value === LOG_VALS.ANY_STRING;
}

export class ProcRunner {
	private _proc: ChildProcess|null = null;
	private _written: string[] = [];
	private _exitCode: number|undefined;
	private _exitCodeExpected: number|undefined;
	private _timeout: NodeJS.Timer|null = null;
	private _listeners: ((text: string) => void)[] = [];
	private _reads: string[] = [];
	private _writtenExpected: ({
		type: 'regular';
		content: string|RegExp;
	}|{
		type: 'captureRegxp';
		content: RegExp;
	}|{
		type: 'specials';
		content: LOG_VALS;
	})[] = [];

	private _capturedRegex: (RegExpExecArray|string[])[] = [];
	
	constructor(private _args: string[], private _config: {
			printlogs?: boolean;
			printifnomatch?: boolean;
			env?: {
				[key: string]: any;
			}
		} = {
			printifnomatch: false,
			printlogs: false,
			env: {}
		}) { }

	private _readText(chunk: string|Buffer) {
		if (this._config.printlogs) {
			console.log(chunk);
		}
		const str = chunk.toString();
		for (const listener of this._listeners) {
			listener(str);
		}
		this._written.push(str);
	}

	public onText(listener: (text: string) => void) {
		this._listeners.push(listener);
	}

	public expectRead(answer: string) {
		this._reads.push(answer);
	}

	public captureRegExp(expr: RegExp) {
		this._writtenExpected.push({
			type: 'captureRegxp',
			content: expr
		});
	}

	public expectWrite(value?: string|LOG_VALS|RegExp) {
		if (value instanceof RegExp) {
			this._writtenExpected.push({
				type: 'regular',
				content: value
			});
		} else if (isLogVal(value)) {
			this._writtenExpected.push({
				type: 'specials',
				content: value
			})
		} else if (value) {
			this._writtenExpected.push({
				type: 'regular',
				content: value + '\n'
			});
		} else {
			this._writtenExpected.push({
				type: 'regular',
				content: '\n'
			});		
		}
	}

	public expectExit(code: number) {
		this._exitCodeExpected = code;
	}

	private _areEqual(actual: string, expected:  {
		type: "regular";
		content: string | RegExp | LOG_VALS;
	} | {
		type: "captureRegxp";
		content: RegExp;
	}|{
		type: 'specials';
		content: LOG_VALS;
	}): boolean {
		switch (expected.type) {
			case 'specials':
				switch (expected.content) {
					case LOG_VALS.ANY_STRING:
						return typeof actual === 'string';
				}
				break;
			case 'regular':
				if (expected.content instanceof RegExp) {
					return !!expected.content.exec(actual.trim());
				} else if (typeof expected.content === 'string') {
					return actual.trim() === expected.content.trim();
				}
				break;
			case 'captureRegxp':
				return !!expected.content.exec(actual.trim());
		}
		return true;
	}

	private _checkOutput() {
		const writtenLines = this._written.join('').split('\n').slice(0, -1);
		const longest = Math.max(writtenLines.length, this._writtenExpected.length);
		for (let i = 0; i < longest; i++) { 
			const written = writtenLines[i];
			const expected = this._writtenExpected[i];

			if (this._config.printifnomatch && !this._areEqual(written, expected)) {
				console.log('written', writtenLines, 'expected', this._writtenExpected);
			}

			assert.notEqual(written, undefined, 
				`a value should be written (while expecting "${
					expected && expected.content && expected.content.toString()}")`);
			assert.notEqual(written, null, 
				`a value should be written (while expecting "${
					expected && expected.content && expected.content.toString()}")`);
			assert.notEqual(expected, undefined, 
				`a value should be expected (while writing "${written && written.toString()}")`);
			assert.notEqual(expected, null, 
				`a value should be expected (while writing "${written && written.toString()}")`);

			switch (expected.type) {
				case 'specials':
					switch (expected.content) {
						case LOG_VALS.ANY_STRING:
							assert.strictEqual(typeof written, 'string', 
								'Written value is string');
							break;
					}
					break;
				case 'regular':
					if (expected.content instanceof RegExp) {
						assert.match(written.trim(), expected.content,
							'written is the same as expected');
					} else if (typeof expected.content === 'string') {
						assert.strictEqual(written.trim(), expected.content.trim(),
							'written is the same as expected');
					}
					break;
				case 'captureRegxp':
					assert.match(written.trim(), expected.content,
						'written is the same as expected');
					const captured = expected.content.exec(written.trim());
					if (captured !== null) {
						this._capturedRegex.push(captured);
					} else {
						this._capturedRegex.push([]);
					}
					break;
			}
		}
	}

	private _checkExitCode() {
		assert.strictEqual(this._exitCode, this._exitCodeExpected,
			'exit code matches expected exit code');
	}

	public check() {
		this._checkOutput();
		this._checkExitCode();
	}

	private _kill() {
		this._proc!.kill();
		if (!this.done) {
			this._exitCode = -1;
			this.done = true;

			if (this.ondone) {
				this.ondone();
			}
		}
	}

	public updateTimer(timeout: number) {
		if (this._timeout) {
			clearTimeout(this._timeout);
		}
		this._timeout = setTimeout(() => {
			this._kill();
		}, timeout);
		return new Promise((resolve) => {
			this.ondone = resolve;
		});
	}

	private ondone!: (() => void);
	private done: boolean = false;
	public run(timeout?: number): Promise<void> {
		return new Promise((resolve) => {
			this.done = false;
			this.ondone = resolve;

			this._proc = spawn('node', [
				path.join(__dirname, './../../app/main.js'),
				...this._args
			], {
				env: {...process.env, ...(this._config.env || {})}
			}).once('exit', (code: number) => {
				if (!this.done) {
					this._exitCode = code;
					this.done = true;

					if (this.ondone) {
						this.ondone();
					}
				}
			});

			if (timeout && timeout !== Infinity) {
				this._timeout = setTimeout(() => {
					this._kill();
				}, timeout);
			}
			
			listenWithoutRef(this._proc!.stdout, (chunk) => {
				this._readText(chunk);
			});
			listenWithoutRef(this._proc!.stderr, (chunk) => {
				this._readText(chunk);
			});

			for (const val of this._reads) {
				this._proc!.stdin.write(val + '\n');
			}
			this._proc!.stdin.end();

			if (this.done) {
				resolve(undefined);
			}
		});
	}

	public getRegexps() {
		return this._capturedRegex;
	}
}