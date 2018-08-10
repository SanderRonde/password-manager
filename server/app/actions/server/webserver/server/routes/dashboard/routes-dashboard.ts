import { ServerResponse } from "../../modules/ratelimit";
import { render } from "../../modules/render";
import { Webserver } from "../../webserver";
import { COUNT } from "../../modules/auth";
import * as express from 'express'
import * as path from 'path'

const routesBase = path.join(__dirname, '../../../client/');

export class RoutesDashboard {
	serveDir: string;

	constructor(public server: Webserver) { 
		this.serveDir = path.join(routesBase, server.config.development ?
			'src/' : 'dest/');
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
				page: 'login',
				theme: this.server.Router.getTheme(req, res),
				comm_token: token,
				server_public_key: publicKey
			},
			rootElement: 'login-page',
			script: 'entrypoints/login/login-page.js',
			title: 'Log in to your dashboard',
			isDevelopment: this.server.config.development
		});
	}

	public async dashboard(req: express.Request, res: ServerResponse) {
		if (!this.checkDashboardAuthentication(req, res)) {
			return;
		}

		await render(res, {
			data: {
				page: 'dashboard',
				theme: this.server.Router.getTheme(req, res)
			},
			rootElement: 'dashboard-page',
			script: 'entrypoints/dashboard/dashboard-page.js',
			title: 'Your Dashboard',
			isDevelopment: this.server.config.development
		});
	}
}