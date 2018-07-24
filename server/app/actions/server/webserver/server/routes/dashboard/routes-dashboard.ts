import { Dashboard } from "../../../../../../../../shared/components/entrypoints/dashboard/dashboard";
import { Login } from "../../../../../../../../shared/components/entrypoints/login/login";
import { ResponseCaptured } from "../../modules/ratelimit";
import { render } from "../../modules/render";
import { Webserver } from "../../webserver";
import express = require('express');
import path = require('path');

const routesBase = path.join(__dirname, '../../../client/');

export class RoutesDashboard {
	serveDir: string;

	constructor(public server: Webserver) { 
		this.serveDir = path.join(routesBase, server.config.development ?
			'src/' : 'dest/');
	}

	public checkDashboardAuthentication(req: express.Request, res: ResponseCaptured) {
		const { login_auth } = req.cookies;
		if (!login_auth || !this.server.Auth.verifyCookie(login_auth)) {
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
		render(res, {
			App: Login,
			script: 'entrypoints/login/login.js',
			stylesheet: 'entrypoints/login/login.css',
			title: 'Log in to your dashboard'
		});
	}

	public async dashboard(req: express.Request, res: ResponseCaptured) {
		if (!this.checkDashboardAuthentication(req, res)) {
			return;
		}

		render(res, {
			App: Dashboard,
			script: 'entrypoints/dashboard/dashboard.js',
			stylesheet: 'entrypoints/dashboard/dashboard.css',
			title: 'Your Dashboard'
		});
	}
}