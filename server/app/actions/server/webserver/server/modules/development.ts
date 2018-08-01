import { PROJECT_ROOT } from "../../../../../lib/constants";
import { ResponseCaptured } from "./ratelimit";
import { Webserver } from "../webserver";
import * as express from 'express'
import * as webpack from 'webpack'
import * as fs from 'fs-extra'
import * as path from 'path'

function synchronizePromise<T>(prom: Promise<T>): Promise<{
	err: Error|null;
	result: T|null;
}> {
	return new Promise((resolve) => {
		prom.catch((err) => {
			resolve({
				err,
				result: null
			})
		}).then((result) => {
			resolve({
				err: null,
				result: result as T
			})
		});
	});
}

function serve(root: string, {
	rewrite = (val) => val,
	prefix = '',
	exclude = [],
	extensions = []
}: {
	rewrite?: (content: string, filename: string) => Promise<string>|string;
	prefix?: string;
	exclude?: string[];
	extensions?: string[]
} = {}): express.RequestHandler {
	return async (req: express.Request, res: ResponseCaptured, next: express.NextFunction) => {
		if (!req.url.startsWith(prefix)) {
			return next();
		}

		if (exclude.indexOf(path.basename(req.url)) !== -1) {
			return next();
		}

		const basePath = path.join(root, req.url.slice(prefix.length));
		const filePaths = [basePath, ...extensions.map((extension) => {
			return `${basePath}.${extension}`
		})];
		for (const filePath of filePaths) {
			const { err, result } = await synchronizePromise(fs.readFile(filePath));
			if (err) {
				continue;
			}
			res.contentType(filePath);
			res.status(200);
			res.send(await rewrite(result!.toString(), filePath));
			res.end();
			return;
		}
		next();
	}
}

function rewriteEsModuleImports(file: string): string {
	return file	
		.replace(/import (.*) from ['"]lit-html['"]/g, 'import $1 from \'/modules/lit-html\'')
		.replace(/import (.*) from ['"]lit-html\/lib\/lit-extended['"]/g, 'import $1 from \'/modules/lit-html/lib/lit-extended\'');
}

async function genSingleFileWebpackRoute(res: express.Response, name: string, src: string) {
	const { err, result } = await synchronizePromise(fs.readFile(path.join(
		PROJECT_ROOT, 'temp/', `${name}.js`
	)));
	if (!err) {
		res.contentType('.js');
		res.write(`${result}\n\n
		export default _${name}.default;`);
		res.end();
		return;
	}
	
	webpack({
		mode: "development",
		entry: src,
		output: {
			library: `_${name}`,
			path: path.join(PROJECT_ROOT, 'temp/'),
			filename: `${name}.js`
		}
	}, async (err) => {
		if (err) {
			res.status(500);
			res.end();
		} else {
			res.contentType('.js');
			const { err, result: content } = await synchronizePromise(fs.readFile(path.join(
				PROJECT_ROOT, 'temp/', `${name}.js`
			)));
			if (err) {
				res.status(500);
				res.end();
				return;
			}
			res.write(`${content}\n\n
			export default _${name}.default;`);
			res.end();
		}
	});
}

export function initDevelopmentMiddleware(webserver: Webserver, base: string) {
	webserver.app.all('/shared/lib/shared-crypto.js', async (_req, res) => {
		await genSingleFileWebpackRoute(res, 'sharedCrypto', 
			path.join(PROJECT_ROOT, `shared/lib/shared-crypto.js`));
	});
	webserver.app.all('/shared/lib/browser-crypto.js', async (_req, res) => {
		await genSingleFileWebpackRoute(res, 'browserCrypto', 
			path.join(PROJECT_ROOT, `shared/lib/browser-crypto.js`));
	});
	webserver.app.all([
		'/modules/lit-html',
		'/modules/lit-html.js',
		'/modules/lit-html/lit-html.js'
	], async (_req, res) => {
		res.contentType('.js');
		res.write(await fs.readFile(path.join(PROJECT_ROOT, 'node_modules/lit-html/lit-html.js')));
		res.end();
	});
	webserver.app.all([
		'/modules/lit-html.js.map',
		'/modules/lit-html/lit-html.js.map'
	], async (_req, res) => {
		res.contentType('.js');
		res.write(await fs.readFile(path.join(PROJECT_ROOT, 'node_modules/lit-html/lit-html.js.map')));
		res.end();
	});
	webserver.app.all('/modules/lit-html/lib/lit-extended', async (_req, res) => {
		res.contentType('.js');
		res.write(await fs.readFile(path.join(PROJECT_ROOT, 'node_modules/lit-html/lib/lit-extended.js')));
		res.end();
	});
	webserver.app.all('/modules/lit-html/lib/lit-extended.js.map', async (_req, res) => {
		res.contentType('.js');
		res.write(await fs.readFile(path.join(PROJECT_ROOT, 'node_modules/lit-html/lib/lit-extended.js.map')));
		res.end();
	});
	webserver.app.use(serve(path.join(base, 'src/'), {
		rewrite(content, filePath) {
			if (filePath.endsWith('.js')) {
				return rewriteEsModuleImports(content);
			}
			return content;
		}
	}));
	webserver.app.use(serve(path.join(base, 'build/static/'), {
		prefix: '/static/'
	}));
	webserver.app.use(serve(path.join(PROJECT_ROOT, 'shared/components/'), {
		rewrite(content, filePath) {
			if (filePath.endsWith('.js')) {
				return rewriteEsModuleImports(content);
			}
			return content;
		},
		extensions: ['js']
	}));
	webserver.app.use(serve(path.join(PROJECT_ROOT, 'shared/components/'), {
		prefix: '/shared/components',
		rewrite(content, filePath) {
			if (filePath.endsWith('.js')) {
				return rewriteEsModuleImports(content);
			}
			return content;
		},
		extensions: ['js']
	}));
	webserver.app.use(serve(path.join(PROJECT_ROOT, 'shared/'), {
		prefix: '/shared',
		rewrite(content, filePath) {
			if (filePath.endsWith('.js')) {
				return rewriteEsModuleImports(content);
			}
			return content;
		},
		extensions: ['js']
	}));
}