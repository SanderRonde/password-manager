/// <reference path="../typings/global.d.ts" />
import { Backup, BackupConfig, BackupSettings } from "./actions/backup/backup";
import { ServerConfig, ServerSettings, Server } from "./actions/server/server";
import { Account } from "./actions/account/account";
import { getDatabase } from "./database/database";
import { readJSON, exitWith } from "./lib/util";
import { VERSION } from "./lib/constants";
import * as commander from 'commander';

export interface Log {
	write(...args: any[]): void;
	read?(description: string): Promise<string>;
};

export async function main(argv: string[], log: Log = {
	write(...args) {
		console.log(...args);
	}
}, overrideStdout: boolean = false) {
	commander
		.version(VERSION, '-v, --version');

	commander
		.command('account <action>')
		.description('create or delete an account')
		.option('-a, --account <email>', 'Account name (email)')
		.option('-p, --password <pw>', 'The password used to decrypt the database')
		.option('-d, --database <location>', 'The path to the database', 
			'mongodb://127.0.0.1:27017/pwmanager')
		.action(async (action: string, { 
			account: email,
			database: databasePath,
			password: dbPassword
		}: { 
			account: string;
			database: string;
			password?: string;
		}) => {
			if (!email) {
				exitWith(log, 'Please supply the email of the account to edit through -a');
			}
			switch (action.toLowerCase()) {
				case 'create':
					Account.CreateAccount.createAccount(log, email, await getDatabase(log, databasePath, dbPassword, true));
					break;
				case 'delete':
					Account.DeleteAccount.deleteAccount(log, email, await getDatabase(log, databasePath, dbPassword, true));
					break;
				default:
					exitWith(log, 'Invalid account action, choose "create" or "delete"');
			}
		});

	commander
		.command('backup <method>')
		.description('backup the database')
		.option('-c, --config', 'The path to a configuration file')
		.option('-p, --password', 'A password that is used to encrpt/decrypt the backup file')
		.option('-i, --input', 'The path to the backup file to load (if using "load")')
		.option('-o, --output', 'The path to the backup file output (if using "local")')
		.option('-d, --database <location>', 'The path to the database', 
			'mongodb://127.0.0.1:27017/pwmanager')
		.action(async (method: string, settings: BackupSettings) => {
			if (settings.config) {
				settings = {
					...await readJSON<BackupConfig>(settings.config),
					config: settings.config,
					isConfig: true
				}
			}

			switch (method.toLowerCase()) {
				case 'load':
				case 'open':
					if (settings.config) {
						exitWith(log, 'You specified a config file but you\'re using' + 
							'the "load" option. This seems a bit conflicting,' +
							' remove the config option to continue');
					}
					if (!settings.input) {
						exitWith(log, 'No input was specified');
					}
					break;
				case 'drive':
				case 'google':
				case 'googledrive':
					Backup.GoogleDrive.backup(log, settings);
					break;
				case 'local':
					if (!settings.output) {
						exitWith(log, 'No output was specified');
					}
					Backup.Local.backup(log, settings);
					break;
				default:
					exitWith(log, 'Invalid backup method, choose "load", "drive" or "local"');
			}
		});

	commander
		.command('server')
		.description('run the webserver and the API endpoint')
		.option('-c, --config', 'The path to a configuration file')
		.option('--http <http_port>', 'The port to use for non-https traffic', 80)
		.option('--https <https_port>', 'The port to use for https traffic', 443)
		.option('--https-key <https_key>', 'The path to the HTTPS key')
		.option('--https-cert <https_cert>', 'The path to the HTTPS cert')
		.option('--no-rate-limit', 'Disable rate limiting')
		.option('-p, --password <pw>', 'The password used to decrypt the database')
		.option('-d, --database <location>', 'The path to the database', 
			'mongodb://127.0.0.1:27017/pwmanager')
		.action(async (settings: ServerSettings) => {
			if (settings.config) {
				settings = {
					...await readJSON<ServerConfig>(settings.config),
					config: settings.config,
					isConfig: true
				}
			}
			Server.run(await getDatabase(log, settings.database, settings.password, false),
				settings as  ServerConfig);
		});

	commander
		.command('genconfig <command>')
		.description('generate a config file for given command')
		.option('-o, --output', 'The path to the output location')
		.action(async (command: string, settings: {
			output?: string;
		}) => {
			switch (command) {
				case 'server':
					Server.genConfig(settings);
					break;
				case 'backup':
					Backup.genConfig(settings);
					break;
				default:
					exitWith(log, 'Given command has no config file, use "server" or "backup"');
			}
		});

	commander
		.command('*')
		.action(() => {
			commander.help();
		});

	const originalWrite = process.stdout.write;
	if (overrideStdout) {
		process.stdout.write = ((...vals: any[]) => {
			log.write.apply(log, vals);
		}) as any;
	}
	commander.parse(argv);
	if (overrideStdout) {
		process.stdout.write = originalWrite;
	}
}

if (require.main === module) {
	main(process.argv).catch(error => {
	  	console.error(error.stack || error.message || error);
	  	process.exitCode = 1;
	});
}