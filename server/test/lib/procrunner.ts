import { GenericTestContext, Context } from "ava";
import { listenWithoutRef } from "./util";
import { spawn } from "child_process";
import * as path from 'path'

export enum LOG_VALS {
	ANY_STRING = 0
}

function isLogVal(value: any): value is LOG_VALS {
	return value === LOG_VALS.ANY_STRING;
}

export class ProcRunner {
	private _written: string[] = [];
	private _exitCode: number|undefined;
	private _exitCodeExpected: number|undefined;
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
	
	constructor(private _t: GenericTestContext<Context<any>>, 
		private _args: string[], private _config: {
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
		this._written.push(chunk.toString());
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
				this._t.log('written', writtenLines, 'expected', this._writtenExpected);
			}

			this._t.not(written, undefined, 
				`a value should be written (while expecting "${
					expected && expected.content && expected.content.toString()}")`);
			this._t.not(written, null, 
				`a value should be written (while expecting "${
					expected && expected.content && expected.content.toString()}")`);
			this._t.not(expected, undefined, 
				`a value should be expected (while writing "${written && written.toString()}")`);
			this._t.not(expected, null, 
				`a value should be expected (while writing "${written && written.toString()}")`);

			switch (expected.type) {
				case 'specials':
					switch (expected.content) {
						case LOG_VALS.ANY_STRING:
							this._t.is(typeof written, 'string', 
								'Written value is string');
							break;
					}
					break;
				case 'regular':
					if (expected.content instanceof RegExp) {
						this._t.regex(written.trim(), expected.content,
							'written is the same as expected');
					} else if (typeof expected.content === 'string') {
						this._t.is(written.trim(), expected.content.trim(),
							'written is the same as expected');
					}
					break;
				case 'captureRegxp':
					this._t.regex(written.trim(), expected.content,
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
		this._t.is(this._exitCode, this._exitCodeExpected,
			'exit code matches expected exit code');
	}

	public check() {
		this._checkOutput();
		this._checkExitCode();
	}

	public run(timeout?: number): Promise<void> {
		return new Promise((resolve) => {
			let done: boolean = false;
			let ondone: () => void = resolve;

			const proc = spawn('node', [
				path.join(__dirname, './../../app/main.js'),
				...this._args
			], {
				env: {...process.env, ...(this._config.env || {})}
			}).once('exit', (code: number) => {
				if (!done) {
					this._exitCode = code;
					done = true;

					if (ondone) {
						ondone();
					}
				}
			});

			if (timeout) {
				setTimeout(() => {
					proc.kill();
					if (!done) {
						this._exitCode = -1;
						done = true;

						if (ondone) {
							ondone();
						}
					}
				}, timeout);
			}
			
			listenWithoutRef(proc.stdout, (chunk) => {
				this._readText(chunk);
			});
			listenWithoutRef(proc.stderr, (chunk) => {
				this._readText(chunk);
			});

			for (const val of this._reads) {
				proc.stdin.write(val + '\n');
			}
			proc.stdin.end();

			if (done) {
				resolve(undefined);
			}
		});
	}

	public getRegexps() {
		return this._capturedRegex;
	}
}