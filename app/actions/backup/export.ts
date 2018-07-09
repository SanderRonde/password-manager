import { ENCRYPTION_ALGORITHM } from '../../lib/constants';
import { encrypt } from '../../lib/crypto';
import { exitWith } from '../../lib/util';
import { exec } from 'child_process';
import { Log } from '../../main';

export namespace Export {
	function assertDumpExists(log: Log) {
		return new Promise<boolean>((resolve) => {
			exec('mongodump --help', (err) => {
				if (err) {
					exitWith(log, 'Please install the tools from' + 
						' https://github.com/mongodb/mongo-tools');
				}
				resolve(!err);
			});
		});
	}

	export async function exportDatabase(log: Log, dbPath: string, password: string): Promise<string> {
		return new Promise<string>(async (resolve) => {
			await assertDumpExists(log);
			log.write('Dumping...');
			exec(`mongodump --uri ${dbPath}` + 
				` --archive`, (err, stdout, stderr) => {
					if (err || stderr) {
						log.write(stderr);
						exitWith(log, 'Failed to run dumping program');
					} else {
						const unEncryptedArchive = stdout;
						log.write('Encrypting, this may take a while...');
						const { data: encrypted } = encrypt(unEncryptedArchive, 
							password, ENCRYPTION_ALGORITHM);
						
						resolve(encrypted);
					}
				});
		});
	}
}