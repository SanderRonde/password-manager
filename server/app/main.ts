/// <reference path="../../typings/global.d.ts" />
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

const HELP_ARGS = ['-v', '--version', '-h', '--help'];
function calledHelpArg(argv: string[]) {
	for (const helpArg of HELP_ARGS) {
		if (argv.indexOf(helpArg) !== -1) {
			return true;
		}
	}
	return false;
}

export function initCommander(handledHolder: {
	handled: boolean;
}) {
	commander
		.version(VERSION, '-v, --version');

	commander
		.command('account <create/delete>')
		.description('create or delete an account')
		.option('-a, --account <email>', 'Account name (email)')
		.option('-p, --password <pw>', 'The password used to decrypt the database')
		.option('-d, --database <location>', 'The path to the database', 
			'mongodb://127.0.0.1:27017/pwmanager')
		.option('--debug')
		.action(async (action: string, { 
			debug,
			account: email,
			database: databasePath,
			password: dbPassword
		}: { 
			debug: boolean;
			account: string;
			database: string;
			password?: string;
		}) => {
			handledHolder.handled = true;

			if (!action) {
				return;
			}
			switch ((action || '').toLowerCase()) {
				case 'create':
					if (!email) {
						exitWith('Please supply the email of the account to edit through -a or --account');
					} else {
						await Account.CreateAccount.createAccount(email, await getDatabase(databasePath, dbPassword, true, false));
					}
					break;
				case 'delete':
					if (!email) {
						exitWith('Please supply the email of the account to edit through -a or --account');
					} else {
						await Account.DeleteAccount.deleteAccount(email, await getDatabase(databasePath, dbPassword, true, false),
							debug);
					}
					break;
				default:
					exitWith('Invalid account action, choose "create" or "delete"');
			}
		});

	commander
		.command('backup <load/googledrive/local>')
		.description('backup the database')
		.option('-c, --config <config>', 'The path to a configuration file')
		.option('-i, --input <input>', 'The path to the backup file to load (if using "load")')
		.option('-o, --output <output>', 'The path to the backup file output (if using "local")')
		.option('-d, --database <database>', 'The path to the database', 
			'mongodb://127.0.0.1:27017/pwmanager')
		.action(async (method: string, settings: BackupSettings) => {
			handledHolder.handled = true;

			if (!method) {
				return;
			}

			if (settings.config) {
				settings = {
					...await readJSON<BackupConfig>(settings.config),
					config: settings.config,
					isConfig: true
				}
			}

			switch ((method || '').toLowerCase()) {
				case 'load':
				case 'open':
					if (settings.config) {
						exitWith('You specified a config file but you\'re using' + 
							'the "load" option. This seems a bit conflicting,' +
							' remove the config option to continue');
					} else if (!settings.input) {
						exitWith('No input was specified');
					} else {
						await Backup.Load.load(settings);
					}
					break;
				case 'drive':
				case 'google':
				case 'googledrive':
					await Backup.GoogleDrive.backup(settings);
					break;
				case 'local':
					if (!settings.output) {
						exitWith('No output was specified');
					} else {
						await Backup.Local.backup(settings);
					}
					break;
				default:
					exitWith('Invalid backup method, choose "load", "drive" or "local"');
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
		.option('--debug', 'Whether to enable debug parameters to the API')
		.option('--development', 'Whether to enable development mode')
		.option('--databaseless', 'Don\'t use any database (for development)')
		.option('--no-https-only', 'Disable only using HTTPS and redirecting HTTP requests')
		.option('--no-ratelimit', 'Disables ratelimiting')
		.action(async (settings: ServerSettings) => {
			handledHolder.handled = true;
			if (settings.config) {
				settings = {
					...await readJSON<ServerConfig>(settings.config),
					config: settings.config,
					isConfig: true
				}
			}
			if (settings.httpsOnly && (!settings.httpsCert || !settings.httpsKey)) {
				console.log('You enabled HTTPS only mode but haven\'t provided HTTPS certs,' + 
					' this means all requests are redirected to a non-existent server');
			}
			Server.run(await getDatabase(settings.database, settings.password, false, 
				settings.databaseless), settings as ServerConfig);
		});

	commander
		.command('genconfig <server/backup>')
		.description('generate a config file for given command')
		.option('-o, --output <output>', 'The path to the output location')
		.action(async (command: string, settings: {
			output?: string;
		}) => {
			handledHolder.handled = true;

			if (!command) {
				return;
			}
			switch (command) {
				case 'server':
					await Server.genConfig(settings);
					break;
				case 'backup':
					await Backup.genConfig(settings);
					break;
				default:
					exitWith('Given command has no config file, use "server" or "backup"');
			}
		});
	return commander;
}

export async function main(argv: string[]) {
	const handledHolder = { handled: false };
	initCommander(handledHolder);

	commander.parse(argv);
	if (!handledHolder.handled && !calledHelpArg(argv)) {
		commander.help();
	}
}

if (require.main === module) {
	main(process.argv).catch(error => {
	  	console.error(error.stack || error.message || error);
	  	process.exit(1);
	});
}