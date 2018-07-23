declare module "express-static" {
	function serveStatic(dir: string): any;

	export = serveStatic;
}