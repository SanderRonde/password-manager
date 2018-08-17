/// <reference types="Cypress" />

import { getFreePort } from '../../../server/test/unit/lib/util';
import * as express from 'express';
import * as http from 'http';
import * as path from 'path';
import * as fs from 'fs';

function htmlTemplate(body: string) {
	return `<!DOCTYPE HTML>
	<html lang="en">
		<head>
			<title>test</title>
		</head>
		<body>
			${body}
		</body>
	</html>`;
}

function readFile(src: string) {
	return new Promise<string>((resolve, reject) => {
		fs.readFile(src, {
			encoding: 'utf8'
		}, (err, data) => {
			if (err) {
				reject(err);
			} else {
				resolve(data.toString());
			}
		})
	});
}

function dashesToUppercase(str: string) {
	let newStr = '';
	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		if (char === '-') {
			newStr += str[i + 1].toUpperCase();
			i += 1;
		} else {
			newStr += char;
		}
	}
	return newStr;
}

const activeServers: Set<http.Server> = new Set();
export function createComponentPage(tagName: string, exportName: string, srcFileName: string, testSrc: string) {
	return new Promise<number>(async (resolve) => {
		const bundle = await cy.fixture(`bundles/${srcFileName}.js`);
		const body = await readFile(path.join(testSrc, `${tagName}.html`));
		const bundleName = dashesToUppercase(srcFileName);
		
		const app = express();
		const html = htmlTemplate(`${body}
		<script src="/js.js"></script>`);
		app.get('/', (_req, res) => {
			res.write(html);
			res.end();
		});
		const js = `${bundle}; 
		${bundleName}.${exportName}.define();`;
		app.get('/js.js', (_req, res) => {
			res.write(js);
			res.end();
		});

		const port = await getFreePort(30000, 50000);
		const server = http.createServer(app).listen(port, () => {
			resolve(port);
		});
		activeServers.add(server);
	});
}

export function clearActiveServers() {
	for (const server of activeServers.values()) {
		server.close();
	}
	activeServers.clear();
}