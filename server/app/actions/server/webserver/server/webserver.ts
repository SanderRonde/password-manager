import { initDevelopmentMiddleware } from "./modules/development";
import { MAX_FILE_SIZE, SERVER_ROOT } from "../../../../lib/constants";
import { Database } from "../../../../database/database";
import { initPeriodicals } from "./modules/periodicals";
import { optionalArrayFn, exitWith } from "../../../../lib/util";
import { WebserverRouter } from "./modules/routing";
import { WebserverRoutes } from "./modules/routes";
import { WebserverAuth } from "./modules/auth";
import * as cookieParser from 'cookie-parser'
import { ServerConfig } from "../../server";
import * as compression from 'compression';
import * as serveStatic from 'serve-static'
import * as bodyParser from 'body-parser'
import { Cache } from "./modules/cache";
import * as express from 'express'
import * as morgan from 'morgan'
import * as https from 'https'
import * as fs from 'fs-extra'
import * as spdy from 'spdy'
import * as http from 'http'
import * as path from 'path'

const base = path.join(__dirname, '../client/');
export const STATIC_SERVE_PATH = path.join(base, 'static/');
export const DEVELOPMENT_SERVE_PATH = path.join(base, 'src/');
export const DEVELOPMENT_SERVE_PATHS = [
	DEVELOPMENT_SERVE_PATH,
	STATIC_SERVE_PATH
];
export const PRODUCTION_SERVE_PATH = path.join(base, 'build/');
export const PRODUCTION_SERVE_PATHS = [
	STATIC_SERVE_PATH,
	PRODUCTION_SERVE_PATH
]

export class Webserver {
	public debug: boolean;
	public app: express.Express;
	public Routes: WebserverRoutes;
	public Router: WebserverRouter;
	public Auth: WebserverAuth = new WebserverAuth();

	private _versions: {
		[key: string]: string;
	}

	constructor(public database: Database, public config: ServerConfig) {
		this.app = express();
		this.debug = !!config.debug;
		this.Routes = new WebserverRoutes(this);
		this.Router = new WebserverRouter(this);
		this._versions = JSON.parse(fs.readFileSync(path.join(SERVER_ROOT, 'app/actions/server/webserver/client/build/versions.json'), {
			encoding: 'utf8'
		}));
	}

	public get assetPath() {
		return path.isAbsolute(this.config.assets) ?
			this.config.assets : path.join(
				SERVER_ROOT, this.config.assets);
	}

	private async _initMiddleware() {
		if (!this.debug) {
			this.app.use(morgan(this.config.development ? 'dev' : 'short'));
		}
		this.app.use(cookieParser());
		this.app.use(bodyParser.json({
			limit: MAX_FILE_SIZE
		}));
		this.app.use((req, res, next) => {
			if (this._versions[req.url]) {
				res.header('Signed-Hash', this._versions[req.url]);
			}
			next();
		});
		this.app.use(compression());
		this.app.use(serveStatic(STATIC_SERVE_PATH, {
			maxAge: 1000 * 60 * 60 * 24 * 7 * 4,
			dotfiles: this.config.development ? 'allow' : 'ignore',
			fallthrough: true,
			index: false,
			redirect: false
		}));
		await fs.mkdirp(this.assetPath);
		this.app.use(serveStatic(this.assetPath, {
			maxAge: 1000 * 60 * 60 * 24 * 7 * 4,
			dotfiles: this.config.development ? 'allow' : 'ignore',
			fallthrough: true,
			index: false,
			redirect: false
		}));
		if (this.config.development) {
			initDevelopmentMiddleware(this);
		} 
		this.app.use(serveStatic(PRODUCTION_SERVE_PATH, {
			maxAge: 1000 * 60 * 60 * 24 * 7 * 4,
			dotfiles: this.config.development ? 'allow' : 'ignore',
			fallthrough: true,
			index: false,
			redirect: false
		}));
		this.app.use(bodyParser.urlencoded({ extended: false }));
	}

	private async _readCredentials() {
		try {
			return {
				key: await fs.readFile(path.join(process.cwd(), this.config.httpsKey!), {
					encoding: 'utf8'
				}),
				cert: await fs.readFile(path.join(process.cwd(), this.config.httpsCert!), {
					encoding: 'utf8'
				})
			};
		} catch(e) {
			exitWith('Cert files are missing');
			return null;
		}
	}

	async init() {
		await this._initMiddleware();
		this.Router.init();
		initPeriodicals(this);
		
		new Cache().warmup();
		await Promise.all([...optionalArrayFn(() => {
				return new Promise(async (resolve) => {
					const credentials = (await this._readCredentials())!;
					const useSpdy = ~~process.version.match(/^v(\d+)/)![1] < 10;
					if (useSpdy) {
						spdy.createServer(credentials, this.app).listen(this.config.https, () => {
							console.log(`HTTPS (spdy) server listening on port ${this.config.https}`);
							resolve();
						});
					} else {
						https.createServer(credentials, this.app).listen(this.config.https, () => {
							console.log(`HTTPS (non-spdy) server listening on port ${this.config.https}`);
							resolve();
						});
					}
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

		return this;
	}
}