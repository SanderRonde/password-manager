"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const backup_1 = require("./actions/backup/backup");
const account_1 = require("./actions/account/account");
const util_1 = require("./lib/util");
const commander = require("commander");
commander
    .version('0.1.0', '-v, --version');
commander
    .command('account <action>')
    .description('create or delete an account')
    .option('-a, --account <email>', 'Account name (email)')
    .action((action, { account: email }) => {
    if (!email) {
        util_1.exitWith('Please supply the email of the account to edit through -a');
    }
    switch (action.toLowerCase()) {
        case 'create':
            account_1.Account.CreateAccount.createAccount(email);
            break;
        case 'delete':
            account_1.Account.DeleteAccount.deleteAccount(email);
            break;
        default:
            util_1.exitWith('Invalid account action, choose "create" or "delete"');
    }
});
commander
    .command('backup <method>')
    .description('backup the database')
    .option('-c, --config', 'The path to a configuration file')
    .option('-p, --password', 'A password that is used to encrpt/decrypt the backup file')
    .option('-i, --input', 'The path to the backup file to load (if using "load")')
    .option('-o, --output', 'The path to the backup file output (if using "local")')
    .action((method, settings) => __awaiter(this, void 0, void 0, function* () {
    if (settings.config) {
        settings = Object.assign({}, yield util_1.readJSON(settings.config), { config: settings.config });
    }
    switch (method.toLowerCase()) {
        case 'load':
        case 'open':
            if (settings.config) {
                util_1.exitWith('You specified a config file but you\'re using' +
                    'the "load" option. This seems a bit conflicting,' +
                    ' remove the config option to continue');
            }
            break;
        case 'drive':
        case 'google':
        case 'googledrive':
            backup_1.Backup.GoogleDrive.backup(settings);
            break;
        case 'onedrive':
        case 'microsoft':
            backup_1.Backup.Onedrive.backup(settings);
            break;
        case 'dropbox':
            backup_1.Backup.Dropbox.backup(settings);
            break;
        case 'local':
            backup_1.Backup.Local.backup(settings);
            break;
        default:
            util_1.exitWith('Invalid backup method, choose "load", "drive", "onedrive",' +
                ' "dropbox" or "local"');
    }
}));
commander
    .command('server')
    .description('run the webserver and the API endpoint')
    .option('-c, --config', 'The path to a configuration file')
    .option('--http <http_port>', 'The port to use for non-https traffic', 80)
    .option('--https <https_port>', 'The port to use for https traffic', 443)
    .option('--https-key <https_key>', 'The path to the HTTPS key')
    .option('--https-key <https_key>', 'The path to the HTTPS cert')
    .option('-d, --dbpath <dbpath>', 'The path to the database', './db/')
    .action((settings) => __awaiter(this, void 0, void 0, function* () {
    if (settings.config) {
        settings = Object.assign({}, yield util_1.readJSON(settings.config), { config: settings.config });
    }
}));
commander
    .command('genconfig <command>')
    .description('generate a config file for given command')
    .option('-o, --output', 'The path to the output location')
    .action((command, settings) => __awaiter(this, void 0, void 0, function* () {
    switch (command) {
        case 'server':
        case 'backup':
        default:
            util_1.exitWith('Given command has no config file, use "server" or "backup"');
    }
}));
commander.parse(process.argv);
