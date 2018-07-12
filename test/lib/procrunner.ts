import { spawn } from "child_process";
import { assert } from 'chai';
import path = require('path');
import { unref, listenWithoutRef } from "./util";

export enum LOG_VALS {
	ANY_STRING
}

export class ProcRunner {
	private _written: string[] = [];
	private _exitCode: number;
	private _exitCodeExpected: number;
	private _reads: string[] = [];
	private _writtenExpected: (string|LOG_VALS|RegExp)[] = [];
	
	constructor(private _args: string[]) { }

	private _readText(chunk: string|Buffer) {
		this._written.push(chunk.toString());
	}

	public expectRead(answer: string) {
		this._reads.push(answer);
	}

	public expectWrite(text?: string|LOG_VALS|RegExp) {
		if (text instanceof RegExp) {
			this._writtenExpected.push(text);
		} else if (text) {
			this._writtenExpected.push(text + '\n');
		} else {
			this._writtenExpected.push('\n');		
		}
	}

	public expectExit(code: number) {
		this._exitCodeExpected = code;
	}

	private _areEqual(actual: string, expected: string|LOG_VALS|RegExp): boolean {
		if (actual === undefined || actual === null || 
			expected === undefined || expected === null) {
				return false;
			}

		if (expected instanceof RegExp) {
			return !!expected.exec(actual.trim());
		} else if (typeof expected === 'string') {
			return actual.trim() === expected.trim();
		} else {
			switch (expected) {
				case LOG_VALS.ANY_STRING:
					return typeof actual === 'string';
			}
		}
		return true;
	}

	private _checkOutput() {
		const writtenLines = this._written.join('').split('\n').slice(0, -1);
		const longest = Math.max(writtenLines.length, this._writtenExpected.length);
		for (let i = 0; i < longest; i++) { 
			const written = writtenLines[i];
			const expected = this._writtenExpected[i];

			if (!this._areEqual(written, expected)) {
				console.log('written', writtenLines, 'expected', this._writtenExpected);
			}

			assert.exists(written, `a value was written (while expecting "${expected && expected.toString()}")`);
			assert.exists(expected, `a value was expected (while writing "${written && written.toString()}")`);

			if (expected instanceof RegExp) {
				assert.match(written.trim(), expected,
					'written is the same as expected');
			} else if (typeof expected === 'string') {
				assert.strictEqual(written.trim(), expected.trim(),
					'written is the same as expected');
			} else {
				switch (expected) {
					case LOG_VALS.ANY_STRING:
						assert.isString(written, 'Written value is string');
						break;
				}
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
}