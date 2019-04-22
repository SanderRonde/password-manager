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
	theme?: string;
	lang?: string;
	isWeb: 'true'|'false';
} & Partial<{
	page: ENTRYPOINT;
} & LoginData & DashboardData>;

export type VALID_THEMES_T = 'light'|'dark';
export type DEFAULT_THEME = 'light';