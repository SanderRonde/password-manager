import { CONSTANTS } from '../../lib/constants';
import { encrypt } from '../../lib/crypto';
import { exitWith } from '../../lib/util';
import { exec } from 'child_process';

export namespace Export {
	function assertDumpExists() {
		return new Promise<boolean>((resolve) => {
			exec('mongodump --help', (err) => {
				if (err) {
					exitWith('Please install the tools from' + 
						' https://github.com/mongodb/mongo-tools');
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
					if (err || stderr) {
						console.log(stderr);
						exitWith('Failed to run dumping program');
					} else {
						const unEncryptedArchive = stdout;
						console.log('Encrypting, this may take a while...');
						const { data: encrypted } = encrypt(unEncryptedArchive, 
							password, CONSTANTS.encryptionAlgorithm);
						
						resolve(encrypted);
					}
				});
		});
	}
}