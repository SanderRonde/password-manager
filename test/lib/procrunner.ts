import { GenericTestContext, Context } from "ava";
import { listenWithoutRef } from "./util";
import { spawn } from "child_process";
import path = require('path');

export enum LOG_VALS {
	ANY_STRING
}

export class ProcRunner {
	private _written: string[] = [];
	private _exitCode: number;
	private _exitCodeExpected: number;
	private _reads: string[] = [];
	private _writtenExpected: ({
		type: 'regular';
		content: string|LOG_VALS|RegExp;
	}|{
		type: 'captureRegxp';
		content: RegExp;
	})[] = [];

	private _capturedRegex: RegExpExecArray[] = [];
	
	constructor(private _t: GenericTestContext<Context<any>>, 
		private _args: string[], private _config: {
			printlogs?: boolean;
			printifnomatch?: boolean;
		} = {
			printifnomatch: false,
			printlogs: false
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

	public expectWrite(text?: string|LOG_VALS|RegExp) {
		if (text instanceof RegExp) {
			this._writtenExpected.push({
				type: 'regular',
				content: text
			});
		} else if (text) {
			this._writtenExpected.push({
				type: 'regular',
				content: text + '\n'
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
	}): boolean {
		switch (expected.type) {
			case 'regular':
				if (expected.content instanceof RegExp) {
					return !!expected.content.exec(actual.trim());
				} else if (typeof expected.content === 'string') {
					return actual.trim() === expected.content.trim();
				} else {
					switch (expected.content) {
						case LOG_VALS.ANY_STRING:
							return typeof actual === 'string';
							break;
					}
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
				`a value was written (while expecting "${expected && expected.toString()}")`);
			this._t.not(expected, null, 
				`a value was written (while expecting "${expected && expected.toString()}")`);
			this._t.not(written, undefined, 
				`a value was expected (while writing "${written && written.toString()}")`);
			this._t.not(expected, null, 
				`a value was expected (while writing "${written && written.toString()}")`);

			switch (expected.type) {
				case 'regular':
					if (expected.content instanceof RegExp) {
						this._t.regex(written.trim(), expected.content,
							'written is the same as expected');
					} else if (typeof expected.content === 'string') {
						this._t.is(written.trim(), expected.content.trim(),
							'written is the same as expected');
					} else {
						switch (expected.content) {
							case LOG_VALS.ANY_STRING:
								this._t.is(typeof written, 'string', 
									'Written value is string');
								break;
						}
					}
					break;
				case 'captureRegxp':
					this._t.regex(written.trim(), expected.content,
						'written is the same as expected');
					this._capturedRegex.push(expected.content.exec(written.trim()));
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

	public run(): Promise<void> {
		let done: boolean = false;
		let ondone: () => void = null;

		const proc = spawn('node', [
			path.join(__dirname, './../../app/main.js'),
			...this._args
		]).once('exit', (code: number) => {
			this._exitCode = code;
			done = true;

			if (ondone) {
				ondone();
			}
		});
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

		return new Promise((resolve) => {
			if (done) {
				resolve(null);
			} else {
				ondone = resolve;
			}
		});
	}

	public getRegexps() {
		return this._capturedRegex;
	}
}