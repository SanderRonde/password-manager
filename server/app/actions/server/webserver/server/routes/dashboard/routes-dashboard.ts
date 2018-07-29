import { GetDashboard } from "../../../../../../../../shared/components/entrypoints/dashboard/dashboard";
import { GetLoginStyled } from "../../../../../../../../shared/components/entrypoints/login/login";
import { ResponseCaptured } from "../../modules/ratelimit";
import { ServerConfig } from "../../../../server";
import { render } from "../../modules/render";
import { Webserver } from "../../webserver";
import { COUNT } from "../../modules/auth";
import fresh = require('import-fresh');
import express = require('express');
import path = require('path');

export const enum ROUTES {
	LOGIN,
	DASHBOARD
}

function getRouteComponent(config: ServerConfig, route: ROUTES.LOGIN): typeof GetLoginStyled;
function getRouteComponent(config: ServerConfig, route: ROUTES.DASHBOARD): typeof GetDashboard;
function getRouteComponent(config: ServerConfig, route: ROUTES): ((...args: any[]) => any)|null {
	if (!config.development) {
		switch (route) {
			case ROUTES.LOGIN:
				return GetLoginStyled;
			case ROUTES.DASHBOARD:
				return GetDashboard;
		}
	} else {
		const sharedComponentsBase = '../../../../../../../../shared/components';
		switch (route) {
			case ROUTES.LOGIN:
				return fresh(`${sharedComponentsBase}/entrypoints/login/login.js`)
					.GetLoginStyled;
			case ROUTES.DASHBOARD:
				return fresh(`${sharedComponentsBase}/entrypoints/dashboard/dashboard.js`)
					.GetDashboard;
		}
	}
	return null;
}

const routesBase = path.join(__dirname, '../../../client/');

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

		render(res, {
			App: getRouteComponent(this.server.config, ROUTES.LOGIN)({
				comm_token: token,
				server_public_key: publicKey
			}),
			script: 'entrypoints/login/login-hydrate.js',
			title: 'Log in to your dashboard',
			development: this.server.config.development
		});
	}

	public async dashboard(req: express.Request, res: ResponseCaptured) {
		if (!this.checkDashboardAuthentication(req, res)) {
			return;
		}

		render(res, {
			App: getRouteComponent(this.server.config, ROUTES.DASHBOARD)(),
			script: 'entrypoints/dashboard/dashboard-hydrate.js',
			title: 'Your Dashboard',
			development: this.server.config.development
		});
	}
}