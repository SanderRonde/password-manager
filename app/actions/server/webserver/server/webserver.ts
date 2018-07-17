import { Database } from "../../../../database/database";
import { WebserverRouter } from "./modules/routing";
import { WebserverRoutes } from "./modules/routes";
import { WebserverAuth } from "./modules/auth";
import cookieParser = require('cookie-parser');
import { ServerConfig } from "../../server";
import bodyParser = require('body-parser');
import express = require('express');
import https = require('https');
import fs = require('fs-extra');
import http = require('http');


export class Webserver {
	public app: express.Express;
	public Routes: WebserverRoutes;
	public Router: WebserverRouter;
	public Auth: WebserverAuth = new WebserverAuth();

	constructor(public database: Database, public config: ServerConfig) {
		this.app = express();
		this.Routes = new WebserverRoutes(this);
		this.Router = new WebserverRouter(this);

		this._init();
	}

	private _initMiddleware() {
		this.app.use(cookieParser());
		this.app.use(bodyParser.json());
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