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
		/**
		 * The even lighter version that appears when you hover over it
		 */
		hover: string,
		/**
		 * The heavier version of the primary color
		 */
		heavy: string
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
		/**
		 * The even lighter version that appears when you hover over it
		 */
		hover: string,
		/**
		 * The darker version of the accent color
		 */
		heavy: string
	},
	/**
	 * The color of a material design card
	 */
	card: string;
	/**
	 * The color of error messages
	 */
	error: string,
	/**
	 * The color of success messages
	 */
	success: string,
	/**
	 * The greyest possible text that still fits the contrast spec on this theme's background
	 */
	minOppositeColorText: string,
	/**
	 * Regular black text on this theme's background color
	 */
	textOnBackground: string,
	/**
	 * Regular white text on the opposite of this theme's background color
	 */
	textOnNonbackground: string,
	/**
	 * The default page background color
	 */
	background: string
}
