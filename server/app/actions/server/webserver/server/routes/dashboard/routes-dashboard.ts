import { Dashboard } from "../../../../../../../../shared/components/entrypoints/dashboard/dashboard";
import { Login } from "../../../../../../../../shared/components/entrypoints/login/login";
import { ResponseCaptured } from "../../modules/ratelimit";
import { ServerConfig } from "../../../../server";
import { render } from "../../modules/render";
import { Webserver } from "../../webserver";
import fresh = require('import-fresh');
import express = require('express');
import path = require('path');

export const enum ROUTES {
	LOGIN,
	DASHBOARD
}

function getRouteComponent(config: ServerConfig, route: ROUTES) {
	if (!config.development) {
		switch (route) {
			case ROUTES.LOGIN:
				return Login;
			case ROUTES.DASHBOARD:
				return Dashboard;
		}
	} else {
		const sharedComponentsBase = '../../../../../../../../shared/components';
		switch (route) {
			case ROUTES.LOGIN:
				return fresh(`${sharedComponentsBase}/entrypoints/login/login.js`)
					.Login;
			case ROUTES.DASHBOARD:
				return fresh(`${sharedComponentsBase}/entrypoints/dashboard/dashboard.js`)
					.Dashboard;
		}
	}
}

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
			App: getRouteComponent(this.server.config, ROUTES.LOGIN),
			script: 'entrypoints/login/login.js',
			title: 'Log in to your dashboard',
			development: this.server.config.development
		});
	}

	public async dashboard(req: express.Request, res: ResponseCaptured) {
		if (!this.checkDashboardAuthentication(req, res)) {
			return;
		}

		render(res, {
			App: getRouteComponent(this.server.config, ROUTES.DASHBOARD),
			script: 'entrypoints/dashboard/dashboard.js',
			title: 'Your Dashboard',
			development: this.server.config.development
		});
	}
}