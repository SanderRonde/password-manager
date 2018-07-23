declare module "mkdirp" {
	function mkdirp(dirPath: string, callback?: (err?: Error) => void): void;
	
	export = mkdirp;
}