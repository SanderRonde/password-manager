import { Webserver } from "../../webserver";
import express = require('express');
import { ResponseCaptured } from "../../modules/ratelimit";

export class RoutesDashboard {
	private readonly BASE_TIMEOUT = 1000 * 60 * 10;

	constructor(public server: Webserver) { }

	private _validCookies: {
		email: string;
		cookie: string;
		valid_until: number;
	}[] = [];

	private _extendDashboardCookie(toExtend: string) {
		for (const cookie of this._validCookies) {
			if (cookie.cookie === toExtend) {
				cookie.valid_until = Date.now() + this.BASE_TIMEOUT;
			}
		}
	}

	private _invalidateDashboardCookies() {
		this._validCookies = this._validCookies.filter(({ valid_until }) => {
			return Date.now() < valid_until;
		});
	}

	public isDashboardAuthenticated(req: express.Request, res: ResponseCaptured) {
		//TODO: use auth for this instead
		const { login_auth } = req.cookies;
			if (!login_auth) {
				res.redirect('/login');
				return false;
			}
			this._invalidateDashboardCookies();
			for (const { cookie } of this._validCookies) {
				if (cookie === login_auth) {
					this._extendDashboardCookie(cookie);
					return true;
				}
			}
		return false;
	}

	public async index(req: express.Request, res: ResponseCaptured) {
		if (this.isDashboardAuthenticated(req, res)) {
			res.redirect('/dashboard');
			return;
		}
	};

	public async login(req: express.Request, res: ResponseCaptured) {
		//TODO:
	}

	public async dashboard(req: express.Request, res: ResponseCaptured) {
		if (!this.isDashboardAuthenticated(req, res)) {
			return;
		}

		//TODO:
	}
}