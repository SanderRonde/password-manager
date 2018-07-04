import { Webserver } from "./webserver/server/webserver";
import { readFile, writeFile } from "../../lib/util";
import { Database } from "../../database/database";
import path = require('path');

export interface ServerArgs {
	config?: string;
	http: number;
	https: number;
	httpsKey?: string;
	httpsCert?: string;
	dbpath: string;
	password?: string;
	database: string;
	rateLimit: boolean;
}

export interface ServerConfig extends ServerArgs {
	config: string;
	isConfig: true

	email?: {
		server: string;
		port: string;
		user: string;
		password: string;
		from: string;
	}
}

export type ServerSettings = ServerArgs|ServerConfig;

export namespace Server {
	export function run(database: Database, config: ServerConfig) {
		new Webserver(database, config, database.log);
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