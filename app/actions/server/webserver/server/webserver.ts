import { Database } from "../../../../database/database";
import { WebserverRouter } from "./modules/routing";
import { WebserverRoutes } from "./modules/routes";
import { readFile } from "../../../../lib/util";
import { WebserverAuth } from "./modules/auth";
import { ServerConfig } from "../../server";
import bodyParser = require('body-parser');
import { Log } from "../../../../main";
import express = require('express');
import https = require('https');
import http = require('http');


export class Webserver {
	public app: express.Express;
	public Auth: WebserverAuth = new WebserverAuth();
	public Routes: WebserverRoutes = new WebserverRoutes(this);
	public Router: WebserverRouter = new WebserverRouter(this);

	constructor(public database: Database, public config: ServerConfig, public log: Log) {
		this._init();
	}

	private _initMiddleware() {
		this.app.use(bodyParser.json());
		this.app.use(bodyParser.urlencoded({ extended: false }));
	}

	private async _init() {
		this.app = express();
		this._initMiddleware();
		
		await Promise.all([...(this.config.httpsKey && this.config.httpsCert ?
			[new Promise(async (resolve) => {
				https.createServer({
					key: await readFile(this.config.httpsKey),
					cert: await readFile(this.config.httpsCert)
				}, this.app).listen(this.config.https, () => {
					this.log.write(`HTTPS server listening on port ${this.config.https}`);
					resolve();
				});
			})] : []), 
			new Promise((resolve) => {
				http.createServer(this.app).listen(this.config.http, () => {
					this.log.write(`HTTP server listening on port ${this.config.http}`);
					resolve();
				});
			})
		]);
	}
}