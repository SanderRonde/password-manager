import { APIReturns, APISuccessfulReturns } from "../../../../../../../../shared/types/api";
import { ENTRYPOINT } from "../../../../../../../../shared/types/shared-types";
import { getMockPasswordMeta } from "../../../../../../database/mocks";
import { SERVER_ROOT } from "../../../../../../lib/constants";
import { ServerResponse } from "../../modules/ratelimit";
import { render } from "../../modules/render";
import { Webserver } from "../../webserver";
import { COUNT } from "../../modules/auth";
import * as express from 'express'
import * as path from 'path'
import * as fs from 'fs-extra';

const routesBase = path.join(__dirname, '../../../client/');

export class RoutesDashboard {
	serveDir: string;
	versions: {
		[key: string]: string;
	}

	constructor(public server: Webserver) { 
		this.serveDir = path.join(routesBase, server.config.development ?
			'src/' : 'dest/');
		try {
			this.versions = JSON.parse(fs.readFileSync(path.join(SERVER_ROOT, 'app/actions/server/webserver/client/build/versions.json'), {
				encoding: 'utf8'
			}));
		} catch(e) {
			this.versions = {};
		}
	}

	public checkDashboardAuthentication(req: express.Request, res: ServerResponse) {
		const { login_auth, instance_id } = req.cookies;
		if (!login_auth || !this.server.Auth.verifyAPIToken(login_auth, COUNT.ANY_COUNT,
			instance_id)) {
				res.redirect('/login');
				return false;
			}
		return true;
	}

	public async index(req: express.Request, res: ServerResponse) {
		if (this.checkDashboardAuthentication(req, res)) {
			res.redirect('/dashboard');
			return;
		}
	};

	public async login(req: express.Request, res: ServerResponse) {
		const {
			token, publicKey
		} = this.server.Auth.genDashboardCommToken();

		await render(res, {
			data: {
				isWeb: 'true',
				page: ENTRYPOINT.LOGIN,
				theme: this.server.Router.getTheme(req, res),
				comm_token: token,
				server_public_key: publicKey
			},
			hash: this.versions['/login_offline'],
			rootElement: 'login-page',
			script: 'entrypoints/login/login-page.js',
			title: 'Log in to your dashboard',
			isDevelopment: this.server.config.development
		});
	}

	public async login_offline(_req: express.Request, res: ServerResponse) {
		await render(res, {
			data: {
				isWeb: 'true',
				page: ENTRYPOINT.LOGIN
			},
			hash: this.versions['/login_offline'],
			rootElement: 'login-page',
			script: 'entrypoints/login/login-page.js',
			title: 'Log in to your dashboard',
			isDevelopment: this.server.config.development,
			isOffline: true
		});
	}

	private async _getDashboarData(req: express.Request): Promise<APISuccessfulReturns['/api/password/allmeta']['encrypted']|void> {
		if (this.server.config.development) {
			return getMockPasswordMeta();
		} else {
			const { code, data } = await this.server.Routes.API.Password.doGetAllMeta(
				req.cookies.instance_id, {
					skip: true
				}) as {
					code: number;
					data: APIReturns['/api/password/allmeta']
				};
			if (code !== 200 || data.success !== true) {
				return undefined;
			}
			return data.data.encrypted;
		}
	}

	public async dashboard(req: express.Request, res: ServerResponse) {
		if (!this.server.config.development &&
			!this.checkDashboardAuthentication(req, res)) {
				return;
			}

		const dashboardData = await this._getDashboarData(req);
		await render(res, {
			data: {
				isWeb: 'true',
				...dashboardData !== undefined ? {
					password_meta: dashboardData
				} : {},
				...{
					page: ENTRYPOINT.DASHBOARD,
					theme: this.server.Router.getTheme(req, res)
				}
			},
			hash: this.versions['/dashboard_offline'],
			rootElement: 'dashboard-page',
			script: 'entrypoints/dashboard/dashboard-page.js',
			title: 'Your Dashboard',
			isDevelopment: this.server.config.development
		});
	}

	public async dashboard_offline(_req: express.Request, res: ServerResponse) {
		await render(res, {
			data: {
				isWeb: 'true',
				page: ENTRYPOINT.DASHBOARD
			},
			hash: this.versions['/dashboard_offline'],
			rootElement: 'dashboard-page',
			script: 'entrypoints/dashboard/dashboard-page.js',
			title: 'Your Dashboard',
			isDevelopment: this.server.config.development,
			isOffline: true
		});
	}
}