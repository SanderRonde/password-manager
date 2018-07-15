import { GoogleDrive as _GoogleDrive } from "./methods/googledrive";
import { Local as _Local } from "./methods/local";
import { Load as _Load } from "./methods/load";
import fs = require('fs-extra');
import path = require('path');

export interface BackupArgs {
	config?: string;
	input?: string;
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
		const file = await fs.readFile('./config.json', {
			encoding: 'utf8'
		});
		const filePath = settings.output || 
			path.join(__dirname, '../../../cfg/backup.json');
		await fs.writeFile(filePath, file);
	}
}