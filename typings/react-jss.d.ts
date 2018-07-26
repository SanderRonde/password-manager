declare module "react-jss" {
	export interface ToCssOptions {
		indent?: number;
	}

	export class JssProvider {
		constructor();
		registry: ReadonlyArray<StyleSheet>;
		readonly index: number;
		add(sheet: StyleSheet): void;
		reset(): void;
		remove(sheet: StyleSheet): void;
		toString(options?: ToCssOptions): string;

		render(): string;
		setState(): void;
		forceUpdate(): void;
		props: any;
		state: any;
		context: any;
		refs: any;
	}

	export class SheetsRegistry {
		constructor();
		registry: ReadonlyArray<StyleSheet>;
		readonly index: number;
		add(sheet: StyleSheet): void;
		reset(): void;
		remove(sheet: StyleSheet): void;
		toString(options?: ToCssOptions): string;
	}
}