import { GoogleDrive as _GoogleDrive } from "./methods/googledrive";
import { Local as _Local } from "./methods/local";
import { Load as _Load } from "./methods/load";
import * as fs from 'fs-extra'
import * as path from 'path'

export interface BackupArgs {
	config?: string;
	input: string;
	output?: string;
	database: string;
}

export interface BackupConfig extends BackupArgs {
	config: string;
	isConfig: true;
}

export type BackupSettings = BackupArgs|BackupConfig;

export namespace Backup {
	export const Load = _Load;
	export const Local = _Local;
	export const GoogleDrive = _GoogleDrive;

	export async function genConfig(settings: {
		output?: string;
	}) {
		const file = await fs.readFile(path.join(__dirname, './config.json'), {
			encoding: 'utf8'
		});
		const filePath = settings.output || 
			path.join(__dirname, '../../../cfg/backup.json');
		await fs.mkdirp(path.dirname(filePath));
		await fs.writeFile(filePath, file);
		console.log('Done!');
	}
}