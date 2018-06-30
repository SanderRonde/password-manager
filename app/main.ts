/// <reference path="../typings/global.d.ts" />
import { Backup, BackupConfig, BackupSettings } from "./actions/backup/backup";
import { ServerConfig, ServerSettings, Server } from "./actions/server/server";
import { Account } from "./actions/account/account";
import { readJSON, exitWith } from "./lib/util";
import * as commander from 'commander';
import { getDatabase } from "./database/database";

commander
	.version('0.1.0', '-v, --version');

commander
	.command('account <action>')
	.description('create or delete an account')
	.option('-a, --account <email>', 'Account name (email)')
	.option('-p, --password <pw>', 'The password used to decrypt the database')
	.action(async (action: string, { 
		account: email,
		password: dbPassword
	}: { 
		account: string;
		password?: string;
	}) => {
		if (!email) {
			exitWith('Please supply the email of the account to edit through -a');
		}
		switch (action.toLowerCase()) {
			case 'create':
				Account.CreateAccount.createAccount(email, await getDatabase(dbPassword, true));
				break;
			case 'delete':
				Account.DeleteAccount.deleteAccount(email, await getDatabase(dbPassword, true));
				break;
			default:
				exitWith('Invalid account action, choose "create" or "delete"');
		}
	});

commander
	.command('backup <method>')
	.description('backup the database')
	.option('-c, --config', 'The path to a configuration file')
	.option('-p, --password', 'A password that is used to encrpt/decrypt the backup file')
	.option('-i, --input', 'The path to the backup file to load (if using "load")')
	.option('-o, --output', 'The path to the backup file output (if using "local")')
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
					exitWith('You specified a config file but you\'re using' + 
						'the "load" option. This seems a bit conflicting,' +
						' remove the config option to continue');
				}
				break;
			case 'drive':
			case 'google':
			case 'googledrive':
				Backup.GoogleDrive.backup(settings);
				break;
			case 'onedrive':
			case 'microsoft':
				Backup.Onedrive.backup(settings);
				break;
			case 'dropbox':
				Backup.Dropbox.backup(settings);
				break;
			case 'local':
				Backup.Local.backup(settings);
				break;
			default:
				exitWith('Invalid backup method, choose "load", "drive", "onedrive",' +
					' "dropbox" or "local"');
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
	.option('-p, --password <pw>', 'The password used to decrypt the database')
	.action(async (settings: ServerSettings) => {
		if (settings.config) {
			settings = {
				...await readJSON<ServerConfig>(settings.config),
				config: settings.config,
				isConfig: true
			}
		}
		Server.run(await getDatabase(settings.password, false), settings);
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
				exitWith('Given command has no config file, use "server" or "backup"');
		}
	});

commander.parse(process.argv);