import { decrypt, EncryptionAlgorithm, Encrypted } from "../../../lib/crypto";
import { ENCRYPTION_ALGORITHM } from "../../../lib/constants";
import { listenWithoutRef } from "../../../../test/lib/util";
import { exitWith, readFile } from "../../../lib/util";
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
					return;
				}
				resolve(!err);
			});
		});
	}
	
	export async function load({ database, input, password }: BackupSettings) {
		return new Promise<void>(async (resolve) => {
			await assertRestoreExists();
			
			console.log('Reading file...');
			const file = await readFile(input).catch(() => {
				exitWith('Failed to find input file');
			});

			console.log('Decrypting file...');
			const decrypted = await decrypt<string, EncryptionAlgorithm, string>({
				data: file as Encrypted<EncodedString<string>, string, EncryptionAlgorithm>,
				algorithm: ENCRYPTION_ALGORITHM
			}, password);

			console.log('Restoring...');
			const proc = exec(`mongorestore --uri ${database} --archive`);
			let stderr: string = '';
			listenWithoutRef(proc.stderr, (data) => {
				stderr += data.toString();
			});

			const dataStream = new Writable();
			(dataStream as any)._read = function noop() {};
			proc.stdin.pipe(dataStream);

			dataStream.write(decrypted);
			dataStream.write(null);

			proc.once('exit', (code) => {
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