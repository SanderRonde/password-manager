import { listenWithoutRef } from "../../../../test/lib/util";
import { exitWith } from "../../../lib/util";
import { BackupSettings } from "../backup";
import { exec } from "child_process";
import * as fs from 'fs-extra'

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
	
	export async function load({ database, input }: BackupSettings) {
		return new Promise<void>(async (resolve) => {
			await assertRestoreExists();
			
			console.log('Reading file...');
			await fs.readFile(input).catch(() => {
				exitWith('Failed to find input file');
			});

			//Write a temp file again
			console.log('Restoring...');
			const proc = exec(`mongorestore --noIndexRestore --drop --uri ${database} --archive="${input}"`);

			let stderr: string = '';
			listenWithoutRef(proc.stderr, (data) => {
				stderr += data.toString();
			});

			proc.once('exit', async (code) => {
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