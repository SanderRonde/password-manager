import { initDevelopmentMiddleware } from "./modules/development";
import { Database } from "../../../../database/database";
import { initPeriodicals } from "./modules/periodicals";
import { optionalArrayFn } from "../../../../lib/util";
import { WebserverRouter } from "./modules/routing";
import { WebserverRoutes } from "./modules/routes";
import { WebserverAuth } from "./modules/auth";
import * as cookieParser from 'cookie-parser'
import * as serveStatic from 'serve-static'
import { ServerConfig } from "../../server";
import * as bodyParser from 'body-parser'
import * as express from 'express'
import * as morgan from 'morgan'
import * as fs from 'fs-extra'
import * as spdy from 'spdy'
import * as http from 'http'
import * as path from 'path'

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
		
		await Promise.all([...optionalArrayFn(() => {
				return new Promise(async (resolve) => {
					spdy.createServer({
						key: await fs.readFile(path.join(process.cwd(), this.config.httpsKey!), {
							encoding: 'utf8'
						}),
						cert: await fs.readFile(path.join(process.cwd(), this.config.httpsCert!), {
							encoding: 'utf8'
						})
					}, this.app).listen(this.config.https, () => {
						console.log(`HTTPS server listening on port ${this.config.https}`);
						resolve();
					});
				})
			}, !!(this.config.httpsKey && this.config.httpsCert)),
			new Promise((resolve) => {
				const handler = this.config.httpsOnly ? (req: express.Request, res: express.Response) => {
					res.writeHead(301, {
						'Location': `https://${req.headers.host}${req.url}`
					});
					res.end();
				} : this.app;
				http.createServer(handler).listen(this.config.http, () => {
					console.log(`HTTP server listening on port ${this.config.http}`);
					resolve();
				});
			})
		]);
	}
}