declare module "cypress" {
	interface Options {
		browser?: string;
		ciBuildId?: string;
		config?: Partial<Cypress.ConfigOptions>;
		env?: {
			[key: string]: any;
		}
		group?: boolean;
		headed?: boolean;
		key?: string;
		noExit?: boolean;
		parallel?: boolean;
		port?: number;
		project?: string;
		record?: boolean;
		reporter?: string;
		reporterOptions?: any;
		spec?: string|string[];
	}

	export function open(options?: Options): Promise<any>;
	export function run(options?: Options): Promise<any>;
}