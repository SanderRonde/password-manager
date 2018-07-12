import { spawn } from "child_process";
import { assert } from 'chai';
import path = require('path');

export class ProcRunner {
	private _written: string[] = [];
	private _exitCode: number;
	private _exitCodeExpected: number;
	private _reads: string[] = [];
	private _writtenExpected: string[] = [];
	
	constructor(private _args: string[]) { }

	private _readText(chunk: string|Buffer) {
		this._written.push(chunk.toString());
	}

	public expectRead(answer: string) {
		this._reads.push(answer);
	}

	public expectWrite(text?: string) {
		if (text) {
			this._writtenExpected.push(text + '\n');
		} else {
			this._writtenExpected.push('\n');		
		}
	}

	public expectExit(code: number) {
		this._exitCodeExpected = code;
	}

	private _checkOutput() {
		console.log(this._written, this._writtenExpected);
		const longest = Math.max(this._written.length, this._writtenExpected.length);
		for (let i = 0; i < longest; i++) { 
			const written = this._written[i];
			const expected = this._writtenExpected[i];

			assert.exists(written, `a value was written (while expecting ${expected})`);
			assert.exists(expected, `a value was expected (while writing ${written}`);

			assert.strictEqual(written.trim(), expected.trim(),
				'written is the same as expected');
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
		]).on('exit', (code: number) => {
			this._exitCode = code;
			done = true;

			if (ondone) {
				ondone();
			}
		});
		proc.stdout.on('data', (chunk) => {
			this._readText(chunk);
		});
		proc.stderr.on('data', (chunk) => {
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