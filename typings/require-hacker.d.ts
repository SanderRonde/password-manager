declare module "require-hacker" {
	export function hook(extension: string, callback: (path: string) => string): void;
	export function global_hook(name: String, callback: (path: string, module: any) => {
		source: string;
		path: string;
	}): void;
	export function resolver(callback: (path: string, module: any) => string|void): void;
	export function to_javascript_module(anything: any): string;
	export function resolve(path: string, module: any): string;
}