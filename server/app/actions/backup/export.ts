import { exitWith, genRandomString } from '../../lib/util';
import { exec } from 'child_process';
import * as fs from 'fs-extra'
import * as path from 'path'

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

	function createDumpFile(dbPath: string, silent: boolean = false) {
		return new Promise<string>(async (resolve, reject) => {
			//Create ./out directory
			await fs.mkdirp(path.join(__dirname, '../../../temp'));
			const filePath = path.join(__dirname, `../../../temp/${genRandomString(25)}.dump`);
			exec(`mongodump --uri ${dbPath}` + 
				` --archive="${filePath}"`, (err, _, stderr) => {
					if (err) {
						!silent && console.log(stderr);
						if (silent) {
							reject(err);
						} else {
							exitWith('Failed to run dumping program');
						}
					} else {
						resolve(filePath);
					}
				});
		});
	}

	export async function exportDatabase(dbPath: string, silent: boolean = false): Promise<Buffer> {
			return new Promise<Buffer>(async (resolve, reject) => {
				await assertDumpExists();
				!silent && console.log('Dumping...');

				const dumpFile = await createDumpFile(dbPath, silent);
				const data = await fs.readFile(dumpFile).catch((err) => {
					if (silent) {
						reject(err);
					} else {
						exitWith(`Failed to read written dump file ${err.message}`);
					}
				});
				if (!data) return;

				fs.unlink(dumpFile).catch((err) => {
					if (silent) {
						reject(err);
					} else {
						exitWith(`Failed to remove temp dump ${err.message}`);
					}
				}).then(() => {
					resolve(data);
				});
			});
	}
}