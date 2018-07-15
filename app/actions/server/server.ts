import { Webserver } from "./webserver/server/webserver";
import { Database } from "../../database/database";
import fs = require('fs-extra');
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
		new Webserver(database, config);
	}

	export async function genConfig(settings: {
		output?: string;
	}) {
		const file = await fs.readFile('./config.json', {
			encoding: 'utf8'
		});
		const filePath = settings.output || 
			path.join(__dirname, '../../../cfg/server.json');
		await fs.writeFile(filePath, file);
	}
}