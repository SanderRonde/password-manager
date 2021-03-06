import { Webserver } from "./webserver/server/webserver";
import { Database } from "../../database/database";
import * as fs from 'fs-extra'
import * as path from 'path'

export interface ServerArgs {
	config?: string;
	http: number;
	https: number;
	httpsKey?: string;
	httpsCert?: string;
	dbpath: string;
	password?: string;
	database: string;
	ratelimit: boolean;
	debug: boolean;
	development: boolean;
	databaseless: boolean;
	httpsOnly: boolean;
	assets: string;
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
		return new Webserver(database, config).init();
	}

	export async function genConfig(settings: {
		output?: string;
	}) {
		const file = await fs.readFile(path.join(__dirname, './config.json'), {
			encoding: 'utf8'
		});
		const filePath = settings.output || 
			path.join(__dirname, '../../../cfg/server.json');
		await fs.mkdirp(path.dirname(filePath));
		await fs.writeFile(filePath, file);
		console.log('Done!');
	}
}