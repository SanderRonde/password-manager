import { Webserver } from "../../webserver";
import express = require('express');
import { ResponseCaptured } from "../../modules/ratelimit";

export class RoutesDashboard {
	constructor(public server: Webserver) { }

	public isDashboardAuthenticated(req: express.Request, res: ResponseCaptured) {
		const { login_auth } = req.cookies;
		if (!login_auth || !this.server.Auth.verifyCookie(login_auth)) {
			res.redirect('/login');
			return false;
		}
		return true;
	}

	public async index(req: express.Request, res: ResponseCaptured) {
		if (this.isDashboardAuthenticated(req, res)) {
			res.redirect('/dashboard');
			return;
		}
	};

	public async login(_req: express.Request, res: ResponseCaptured) {
		res.end('//TODO:');
	}

	public async dashboard(req: express.Request, res: ResponseCaptured) {
		if (!this.isDashboardAuthenticated(req, res)) {
			return;
		}

		res.end('//TODO:');
	}
}