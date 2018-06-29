import { readFile, writeFile } from "../../lib/util";
import path = require('path');

export interface ServerArgs {
	config?: string;
}

export interface ServerConfig extends ServerArgs {
	config: string;
	isConfig: true
}

export type ServerSettings = ServerArgs|ServerConfig;

export namespace Server {
	export function run(config: ServerSettings) {
		
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