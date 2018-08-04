import { ROUTES } from '../../modules/development';
import { ResponseCaptured } from "../../modules/ratelimit";
import { render, DevData } from "../../modules/render";
import { Webserver } from "../../webserver";
import { COUNT } from "../../modules/auth";
import * as express from 'express'
import * as path from 'path'

const routesBase = path.join(__dirname, '../../../client/');

async function getDevData(_route: ROUTES, isDevelopment: boolean): Promise<DevData> {
	console.log('getting dev data');
	if (isDevelopment) {
		return {
			enabled: true,
			cssPaths: [] // await getCSSPathsFromCache(route)
		}
	}
	return {
		enabled: false
	}
}

export class RoutesDashboard {
	serveDir: string;

	constructor(public server: Webserver) { 
		this.serveDir = path.join(routesBase, server.config.development ?
			'src/' : 'dest/');
	}

	public checkDashboardAuthentication(req: express.Request, res: ResponseCaptured) {
		const { login_auth, instance_id } = req.cookies;
		if (!login_auth || !this.server.Auth.verifyAPIToken(login_auth, COUNT.ANY_COUNT,
			instance_id)) {
				res.redirect('/login');
				return false;
			}
		return true;
	}

	public async index(req: express.Request, res: ResponseCaptured) {
		if (this.checkDashboardAuthentication(req, res)) {
			res.redirect('/dashboard');
			return;
		}
	};

	public async login(_req: express.Request, res: ResponseCaptured) {
		const {
			token, publicKey
		} = this.server.Auth.genDashboardCommToken();

		await render(res, {
			data: {
				comm_token: token,
				server_public_key: publicKey
			},
			rootName: 'login-page',
			script: 'entrypoints/login/login-page.js',
			title: 'Log in to your dashboard',
			devData: await getDevData(ROUTES.LOGIN,
				this.server.config.development)
		});
	}

	public async dashboard(req: express.Request, res: ResponseCaptured) {
		if (!this.checkDashboardAuthentication(req, res)) {
			return;
		}

		await render(res, {
			data: {},
			rootName: 'dashboard-page',
			script: 'entrypoints/dashboard/dashboard-page.js',
			title: 'Your Dashboard',
			devData: await getDevData(ROUTES.DASHBOARD,
				this.server.config.development)
		});
	}
}