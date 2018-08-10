export interface LoginData {
	comm_token: string,
	server_public_key: string
}

export type GlobalProperties = {
	theme: 'dark'|'light';
} & Partial<(({
	page: 'login';
} & LoginData)|{
	page: 'dashboard';
})>;