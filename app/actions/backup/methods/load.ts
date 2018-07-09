import { decrypt, EncryptionAlgorithm, Encrypted } from "../../../lib/crypto";
import { ENCRYPTION_ALGORITHM } from "../../../lib/constants";
import { exitWith, readFile } from "../../../lib/util";
import { BackupSettings } from "../backup";
import { exec } from "child_process";
import { Log } from "../../../main";
import { Writable } from "stream";

export namespace Load {
	function assertRestoreExists(log: Log) {
		return new Promise<boolean>((resolve) => {
			exec('mongorestore --help', (err) => {
				if (err) {
					exitWith(log, 'Please install the tools from' + 
						' https://github.com/mongodb/mongo-tools');
				}
				resolve(!err);
			});
		});
	}
	
	export async function load(log: Log, { database, input, password }: BackupSettings) {
		return new Promise<void>(async (resolve) => {
			await assertRestoreExists(log);
			
			log.write('Reading file...');
			const file = await readFile(input);

			log.write('Decrypting file...');
			const decrypted = await decrypt<string, EncryptionAlgorithm, string>({
				data: file as Encrypted<EncodedString<string>, string, EncryptionAlgorithm>,
				algorithm: ENCRYPTION_ALGORITHM
			}, password);

			log.write('Restoring...');
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
					log.write(stderr);
					exitWith(log, 'Failed to run restore program (password might be wrong)');
				} else {
					log.write('Done!');
					resolve();
				}
			});
		});
	}
}