import { exitWith, readFile } from "../../../lib/util";
import { CONSTANTS } from "../../../lib/constants";
import { decrypt } from "../../../lib/crypto";
import { BackupSettings } from "../backup";
import { exec } from "child_process";
import { Writable } from "stream";

export namespace Load {
	function assertRestoreExists() {
		return new Promise<boolean>((resolve) => {
			exec('mongorestore --help', (err) => {
				if (err) {
					exitWith('Please install the tools from' + 
						' https://github.com/mongodb/mongo-tools');
				}
				resolve(!err);
			});
		});
	}
	
	export async function load({ database, input, password }: BackupSettings) {
		return new Promise<void>(async (resolve) => {
			await assertRestoreExists();
			
			console.log('Reading file...');
			const file = await readFile(input);

			console.log('Decrypting file...');
			const decrypted = await decrypt<string, string>({
				data: file,
				algorithm: CONSTANTS.algorithm
			}, password);

			console.log('Restoring...');
			const proc = exec(`mongorestore --uri ${database} --archive`);
			let stderr: string = '';
			proc.stderr.on('data', (data) => {
				stderr += data.toString();
			});

			const dataStream = new Writable();
			(dataStream as any)._read = function noop() {};
			proc.stdin.pipe(dataStream);

			dataStream.write(decrypted);
			dataStream.write(null);

			proc.on('exit', (code) => {
				if (code) {
					console.log(stderr);
					exitWith('Failed to run restore program (password might be wrong)');
				} else {
					console.log('Done!');
					resolve();
				}
			});
		});
	}
}