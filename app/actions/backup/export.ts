import { ENCRYPTION_ALGORITHM } from '../../lib/constants';
import { encrypt } from '../../lib/crypto';
import { exitWith } from '../../lib/util';
import { exec } from 'child_process';

export namespace Export {
	function assertDumpExists() {
		return new Promise<boolean>((resolve) => {
			exec('mongodump --help', (err) => {
				if (err) {
					console.log(err);
					exitWith('Please install the tools from' + 
						' https://github.com/mongodb/mongo-tools');
					return;
				}
				resolve(!err);
			});
		});
	}

	export async function exportDatabase(dbPath: string, password: string): Promise<string> {
		return new Promise<string>(async (resolve) => {
			await assertDumpExists();
			console.log('Dumping...');
			exec(`mongodump --uri ${dbPath}` + 
				` --archive`, (err, stdout, stderr) => {
					if (err) {
						console.log(stderr);
						exitWith('Failed to run dumping program');
					} else {
						const unEncryptedArchive = stdout.toString();
						console.log('Encrypting, this may take a while...');
						if (!password) {
							resolve(unEncryptedArchive);
							return;
						}

						const { data: encrypted } = encrypt(unEncryptedArchive, 
							password, ENCRYPTION_ALGORITHM);
						
						resolve(encrypted);
					}
				});
		});
	}
}