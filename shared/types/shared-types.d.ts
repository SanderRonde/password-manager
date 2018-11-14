import { APISuccessfulReturns } from "./api";

export interface LoginData {
	comm_token: string,
	server_public_key: string
}

export interface DashboardData {
	password_meta: APISuccessfulReturns['/api/password/allmeta']['encrypted'];
}

export const enum ENTRYPOINT {
	LOGIN = 'login',
	DASHBOARD = 'dashboard'
}
export type GlobalProperties = {
	theme?: 'dark'|'light';
	isWeb: 'true'|'false';
} & Partial<{
	page: ENTRYPOINT;
} & LoginData & DashboardData>;

export type VALID_THEMES_T = 'light'|'dark';
export type DEFAULT_THEME = 'light';
export interface Theme {
	/**
	 * The primary color
	 */
	primary: {
		/**
		 * The main primary color
		 */
		main: string,
		/**
		 * The weaker/lighter version of the primary color
		 */
		weak: string,
	},
	/**
	 * The accent/secondary color
	 */
	accent: {
		/**
		 * The main accent color
		 */
		main: string,
		/**
		 * The lighter version of the accent color
		 */
		weak: string,
	};
	/**
	 * The color of error messages
	 */
	error: string,
	/**
	 * The color of success messages
	 */
	success: string,
	/**
	 * Regular black text on this theme's background color
	 */
	text: string,
	/**
	 * The default page background color
	 */
	background: string
}
