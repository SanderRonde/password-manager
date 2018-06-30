import commentJson = require('comment-json');
import promptly = require('promptly');
import mkdirp = require('mkdirp');
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

export function exitWith(err: string): never {
	console.log(err);
	return process.exit(1);
}

export async function getConfirmedPassword(msg: string): Promise<string> {
	while (true) {
		const password = await promptly.password(msg);
		if (await promptly.password('Please confirm your password') === password) {
			return password;
		} else {
			console.log('Passwords don\'t match, please try again\n');
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
export function getSecrets(): Secrets {
	if (_secrets) {
		return _secrets;
	}
	try {
		_secrets = require('../../secrets');
		return _secrets;
	} catch(e) {
		return exitWith('Please provide a ./secrets.js file');
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