import { Database } from "../../../../database/database";
import { PROJECT_ROOT, SERVER_ROOT } from "../../../../lib/constants";
import { ResponseCaptured } from "./modules/ratelimit";
import { WebserverRouter } from "./modules/routing";
import { WebserverRoutes } from "./modules/routes";
import serveStatic = require('serve-static');
import { WebserverAuth } from "./modules/auth";
import cookieParser = require('cookie-parser');
import { ServerConfig } from "../../server";
import bodyParser = require('body-parser');
import express = require('express');
import https = require('https');
import fs = require('fs-extra');
import http = require('http');
import path = require('path');

function synchronizePromise<T>(prom: Promise<T>): Promise<{
	err: Error|null;
	result: T|null;
}> {
	return new Promise((resolve) => {
		prom.catch((err) => {
			resolve({
				err,
				result: null
			})
		}).then((result) => {
			resolve({
				err: null,
				result: result as T
			})
		});
	});
}

function serve(root: string, {
	rewrite = (val) => val,
	prefix = ''
}: {
	rewrite?: (content: string, filename: string) => string;
	prefix?: string;
} = {}): express.RequestHandler {
	return async (req: express.Request, res: ResponseCaptured, next: express.NextFunction) => {
		if (!req.url.startsWith(prefix)) {
			return next();
		}

		const filePath = path.join(root, req.url.slice(prefix.length));
		const { err, result } = await synchronizePromise(fs.readFile(filePath));
		if (err) {
			return next();
		}
		res.contentType(filePath);
		res.send(rewrite(result!.toString(), filePath));
		res.end();
	}
}

function commonjsToEs6(file: string): string {
	return file
		.replace(/Object.defineProperty\(exports, .__esModule., { value: true }\);/g, '')
		.replace(/(\w+) (\w+) = require\("react-dom"\)/g, 'import $2 from "/modules/react-dom"')
		.replace(/(\w+) (\w+) = require\("react"\)/g, 'import $2 from "/modules/react"')
		.replace(/(\w+) (\w+) = require\("(.*)"\)/g, 'import * as $2 from "$3.js"')
		.replace(/exports.default = (\w+)/g, 'export default $1')
		.replace(/exports.(\w+) = (\w+)/g, 'export { $2 as $1 }')
}

export class Webserver {
	public debug: boolean;
	public app: express.Express;
	public Routes: WebserverRoutes;
	public Router: WebserverRouter;
	public Auth: WebserverAuth = new WebserverAuth();

	constructor(public database: Database, public config: ServerConfig) {
		this.app = express();
		this.debug = !!config.debug;
		this.Routes = new WebserverRoutes(this);
		this.Router = new WebserverRouter(this);

		this._init();
	}

	private _initMiddleware() {
		this.app.use(cookieParser());
		this.app.use(bodyParser.json());
		const base = path.join(__dirname, '../client/');
		if (this.config.development) {
			this.app.all('/modules/react', async (_req, res) => {
				res.contentType('.js');
				const content = (await fs.readFile(path.join(SERVER_ROOT, 'node_modules/react/umd/',
					'react.development.js'))).toString();
				const replaced = content.replace(/\}\((this), \(function \(\) \{ 'use strict'/,
					'} (window, (function () { \'use strict\'');
				res.write(`${replaced}\n\n
				export default window.React`);

				res.end();
			});
			this.app.all('/modules/react-dom', async (_req, res) => {
				res.contentType('.js');
				const content = (await fs.readFile(path.join(SERVER_ROOT, 'node_modules/react-dom/umd/',
					'react-dom.development.js'))).toString();
				const replaced = content.replace(/\}\((this), \(function \(React\) \{ 'use strict'/g,
					'} (window, (function (React) { \'use strict\'');
				res.write(`${replaced}\n\n
				export default window.ReactDOM`);
				res.end();
			});
			this.app.use(serve(path.join(base, 'src/'), {
				rewrite(content, filePath) {
					if (filePath.endsWith('.js')) {
						return commonjsToEs6(content);
					}
					return content;
				}
			}));
			this.app.use(serve(path.join(PROJECT_ROOT, 'shared/components/'), {
				rewrite(content, filePath) {
					if (filePath.endsWith('.js')) {
						return commonjsToEs6(content);
					}
					return content;
				}
			}));
			this.app.use(serve(path.join(PROJECT_ROOT, 'shared/components/'), {
				prefix: '/shared/components',
				rewrite(content, filePath) {
					if (filePath.endsWith('.js')) {
						return commonjsToEs6(content);
					}
					return content;
				}
			}));
		} else {
			this.app.use(serveStatic(path.join(base, 'build/'), {
				maxAge: 1000 * 60 * 60 * 24 * 7 * 4,
				dotfiles: this.config.development ? 'allow' : 'ignore',
				fallthrough: true,
				index: false,
				redirect: false
			}));
		}
		this.app.use(bodyParser.urlencoded({ extended: false }));
	}

	private async _init() {
		this._initMiddleware();
		this.Router.init();
		
		await Promise.all([...(this.config.httpsKey && this.config.httpsCert ?
			[new Promise(async (resolve) => {
				https.createServer({
					key: await fs.readFile(this.config.httpsKey!, {
						encoding: 'utf8'
					}),
					cert: await fs.readFile(this.config.httpsCert!, {
						encoding: 'utf8'
					})
				}, this.app).listen(this.config.https, () => {
					console.log(`HTTPS server listening on port ${this.config.https}`);
					resolve();
				});
			})] : []), 
			new Promise((resolve) => {
				http.createServer(this.app).listen(this.config.http, () => {
					console.log(`HTTP server listening on port ${this.config.http}`);
					resolve();
				});
			})
		]);
	}
}