import { readFile, writeFile } from "../../lib/util";
import path = require('path');
import { Database } from "../../database/database";

export interface ServerArgs {
	config?: string;
	http: number;
	https: number;
	https_key?: string;
	https_cert?: string;
	dbpath: string;
	password?: string;
	database: string;
}

export interface ServerConfig extends ServerArgs {
	config: string;
	isConfig: true
}

export type ServerSettings = ServerArgs|ServerConfig;

export namespace Server {
	export function run(database: Database, config: ServerSettings) {

	}

	export async function genConfig(settings: {
		output?: string;
	}) {
		const file = await readFile('./config.json');
		const filePath = settings.output || 
			path.join(__dirname, '../../../cfg/server.json');
		await writeFile(filePath, file);
	}
}