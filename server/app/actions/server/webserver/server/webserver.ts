import { initDevelopmentMiddleware } from "./modules/development";
import { Database } from "../../../../database/database";
import { initPeriodicals } from "./modules/periodicals";
import { WebserverRouter } from "./modules/routing";
import { WebserverRoutes } from "./modules/routes";
import { WebserverAuth } from "./modules/auth";
import cookieParser = require('cookie-parser');
import serveStatic = require('serve-static');
import { ServerConfig } from "../../server";
import bodyParser = require('body-parser');
import express = require('express');
import morgan = require('morgan');
import https = require('https');
import fs = require('fs-extra');
import http = require('http');
import path = require('path');

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
		this.app.use(morgan(this.config.development ? 'dev' : 'short'));
		this.app.use(cookieParser());
		this.app.use(bodyParser.json());
		const base = path.join(__dirname, '../client/');
		this.app.use(serveStatic(path.join(base, 'static/'), {
			maxAge: 1000 * 60 * 60 * 24 * 7 * 4,
			dotfiles: this.config.development ? 'allow' : 'ignore',
			fallthrough: true,
			index: false,
			redirect: false
		}));
		if (this.config.development) {
			initDevelopmentMiddleware(this, base);
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
		initPeriodicals(this);
		
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