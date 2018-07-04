import { ServerConfig } from '../actions/server/server';
import commentJson = require('comment-json');
import nodemailer = require('nodemailer');
import promptly = require('promptly');
import mkdirp = require('mkdirp');
import { Log } from '../main';
import path = require('path');
import fs = require('fs');

export function readFile(filePath: string): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		fs.readFile(filePath, {
			encoding: 'utf8'
		}, (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data.toString());
			}
		});
	});
}

export function assertDir(dirPath: string) {
	return new Promise((resolve, reject) => {
		mkdirp(dirPath, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		})
	});
}

export function writeFile(filePath: string, data: string) {
	return new Promise(async (resolve, reject) => {
		await assertDir(path.dirname(filePath)).catch((err) => {
			resolve(err);
		});
		fs.writeFile(filePath, data, {
			encoding: 'utf8'
		}, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

export async function readJSON<T>(filePath: string): Promise<T> {
	return commentJson.parse(await readFile(filePath) as EncodedString<T>);
}

export function exitWith(log: Log, err: string): never {
	log.write(err);
	return process.exit(1);
}

export async function getConfirmedPassword(log: Log, msg: string): Promise<string> {
	while (true) {
		const password = await readPassword(log, msg);
		if (await readPassword(log, 'Please confirm your password') === password) {
			return password;
		} else {
			log.write('Passwords don\'t match, please try again\n');
		}
	}
}

interface Secrets {
	google: {
		web: {
			client_id: string;
			token_uri: string;
			auth_provider_x509_cert_url: string;
			client_secret: string;
		}
	}
}

let _secrets: Secrets;
export function getSecrets(log: Log): Secrets {
	if (_secrets) {
		return _secrets;
	}
	try {
		_secrets = require('../../secrets');
		return _secrets;
	} catch(e) {
		return exitWith(log, 'Please provide a ./secrets.js file');
	}
}

export async function createTempFile(filePath: string, data: string) {
	await writeFile(filePath, data);
	return (): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			fs.unlink(filePath, (err) => {
				if (err) {
					reject(err);
				} else {
					resolve(null);
				}
			});
		});
	}
}

export function sendEmail(log: Log, { email }: ServerConfig, to: string,
	subject: string, content: string) {
		if (!email) {
			log.write('Attempting to send email while no email settings are' + 
				' configured, skipping');
			return;
		}

		const {
			from,
			password,
			port,
			server,
			user
		} = email;

		const transporter = nodemailer.createTransport({
			host: server,
			port: ~~port,
			secure: false,
			auth: {
				user: user,
				pass: password
			}
		});

		transporter.sendMail({
			from: from,
			to: [to],
			subject: subject,
			text: content
		}, (err) => {
			if (err) {
				log.write(err);
			}
		});
	}

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';

export function genRandomString(length: number = 50): string {
	let str = '';
	for (let i = 0; i < length; i++) {
		str += chars[Math.floor(Math.random() * chars.length)];
	}
	return str;
}

export function readPassword(log: Log, text: string) {
	if (!log.read) {
		return promptly.password(text);
	} else {
		return log.read(text);
	}
}

export function readConfirm(log: Log, text: string) {
	if (!log.read) {
		return promptly.confirm(text);
	} else {
		return log.read(text);
	}
}