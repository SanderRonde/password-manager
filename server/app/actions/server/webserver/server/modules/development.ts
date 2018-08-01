import { PROJECT_ROOT } from "../../../../../lib/constants";
import { ResponseCaptured } from "./ratelimit";
import { Webserver } from "../webserver";
import * as express from 'express'
import * as webpack from 'webpack'
import * as fs from 'fs-extra'
import * as path from 'path'
import { parse } from "url";

const IMPORT_MAP = {
	"login": [{
		"colored-button": [
			'ButtonBase'
		]},
		'FormHelperText',
		'FormControl',
		'InputLabel',
		'InputAdornment',
		'IconButton',
		'Input'
	],
	"dashboard": []
}

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
		.replace(/import React from 'react'/g, 'import React from "/modules/react"')
		.replace(/import warning from 'warning';/g, 'import warning from "/modules/warning"')
		.replace(/import pure from 'recompose\/pure'/g, 'import pure from "/modules/recompose/pure"')
		.replace(/import (\w+) from '@material-ui\/core\/(\w+)'/g, 'import $1 from "/modules/material-ui/$2"');
}

function commonjsToEs6(file: string): string {
	const replaced = file
		.replace(/Object.defineProperty\(exports, .__esModule., { value: true }\);/g, '')
		.replace(/(\w+) (\w+) = require\("@material-ui\/core\/(.+)"\)/g, 'import * as $2 from "/modules/material-ui/core/$3"')
		.replace(/(\w+) (\w+) = require\("@material-ui\/icons\/(\w+)(\.js)?"\)/g, 'import * as $2 from "/modules/material-ui/icons/$3"')
		.replace(/(\w+) (\w+) = require\("@material-ui\/core"\)/g, 'import * as $2 from "/modules/material-ui/core"')
		.replace(/(\w+) (\w+) = require\("react-jss(.js)?"\)/g, 'import $2 from "/modules/react-jss"')
		.replace(/(\w+) (\w+) = require\("react-dom"\)/g, 'import $2 from "/modules/react-dom"')
		.replace(/(\w+) (\w+) = require\("react"\)/g, 'import $2 from "/modules/react"')
		.replace(/(\w+) (\w+) = require\("(.*)"\)/g, 'import * as $2 from "$3.js"')
		.replace(/exports.default = ([^;]+)/g, 'export default $1');
	const lines = replaced.split('\n');

	let tempVarsIndex: number = 0;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		let match = /exports.(\w+) = ([^;]+)/.exec(line);
		if (match) {
			const [, name, expr ] = match;
			let tempName = `tempVar${++tempVarsIndex}`;
			while (replaced.indexOf(tempName) !== -1) {
				tempName = `tempVar${++tempVarsIndex}`;
			}

			lines[i] = `;var ${tempName} = ${expr}; export { ${tempName} as ${name} };`;
		}
	}
	return lines.join('\n');
}

function prefixImports(file: string, prefix: string) {
	const lines = file.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = /(.*) from '.\/(.+)'/.exec(line);
		if (match) {
			const [, expr, importPath] = match;
			lines[i] = `${expr} from '${prefix}${importPath}';`
		}
	}
	return lines.join('\n');
}

type ImportMap = (string|{
	[key: string]: ImportMap;
})[];
function flattenImportMap(current: ImportMap, arr: string[]) {
	for (const item of current) {
		if (typeof item === 'string') {
			arr.push(item);
		} else {
			Object.getOwnPropertyNames(item).map((key) => {
				flattenImportMap(item[key], arr);
			});
		}
	}
	return arr;
}

function genCustomMaterialUICore(route: keyof typeof IMPORT_MAP) {
	const imports = flattenImportMap(IMPORT_MAP[route], []);

	return imports.filter((val, index, arr) => arr.indexOf(val) === index).map((component) => {
		return `export { default as ${component} } from './${component}';`
	}).join('\n');
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
	const materialUIRoot = path.join(PROJECT_ROOT, 'node_modules/@material-ui');
	const materialUICoreRoot = path.join(materialUIRoot, 'core/');
	const materialUIIconsRoot = path.join(materialUIRoot, 'icons/');
	webserver.app.all('/modules/react', async (_req, res) => {
		res.contentType('.js');
		const content = (await fs.readFile(path.join(PROJECT_ROOT, 'node_modules/react/umd/',
			'react.development.js'))).toString();
		const replaced = content.replace(/\}\((this), \(function \(\) \{ 'use strict'/,
			'} (window, (function () { \'use strict\'');
		res.write(`${replaced}\n\n
		export default window.React`);

		res.end();
	});
	webserver.app.all('/modules/react-dom', async (_req, res) => {
		res.contentType('.js');
		const content = (await fs.readFile(path.join(PROJECT_ROOT, 'node_modules/react-dom/umd/',
			'react-dom.development.js'))).toString();
		const replaced = content.replace(/\}\((this), \(function \(React\) \{ 'use strict'/g,
			'} (window, (function (React) { \'use strict\'');
		res.write(`${replaced}\n\n
		export default window.ReactDOM`);
		res.end();
	});
	webserver.app.all('/modules/recompose/pure', async (_req, res) => {
		genSingleFileWebpackRoute(res, 'pure', 
			path.join(PROJECT_ROOT, 'node_modules/recompose/pure.js'));	
	});
	webserver.app.all('/modules/material-ui/icons/:icon', async (req, res) => {
		const name = req.params.icon;
		await genSingleFileWebpackRoute(res, name, 
			path.join(materialUIIconsRoot, `${name}.js`));
	});
	webserver.app.all('/modules/material-ui/core', async (req, res) => {
		const ref = req.header('Referer')!;
		const refFile = parse(ref).pathname!;
		const file = refFile.split('/').pop()!.split('.')[0];
		res.contentType('.js');
		res.write(genCustomMaterialUICore(file as keyof typeof IMPORT_MAP));
		res.end();
	});
	webserver.app.use(serve(materialUIIconsRoot, {
		prefix: '/modules/material-ui/icons/',
		exclude: ['index.js'],
		rewrite(file) {
			return rewriteEsModuleImports(file);
		},
		extensions: ['js']
	}));
	webserver.app.use(serve(path.join(materialUICoreRoot, 'es/colors/'), {
		prefix: '/modules/material-ui/core/colors/',
		exclude: ['index.js'],
		extensions: ['js']
	}));
	webserver.app.use(serve(path.join(materialUICoreRoot, 'es/colors/'), {
		prefix: '/modules/es/colors/',
		exclude: ['index.js'],
		extensions: ['js']
	}));
	webserver.app.all('/modules/material-ui/colors', async (_req, res) => {
		res.contentType('.js');
		const file = (await fs.readFile(path.join(materialUICoreRoot, 'es/colors/index.js')))
			.toString();
		res.write(prefixImports(file, '/modules/es/colors/'));
		res.end();
	});
	webserver.app.all('/modules/react-jss', async (_req, res) => {
		res.contentType('.js');
		res.write(`
		import theming from './theming';
		const {
			ThemeProvider, withTheme, createTheming
		} = theming;
		import JssProvider from './react-jss/JssProvider';
		import jss from './react-jss/jss';
		const { SheetsRegistry, createGenerateClassNameDefault } = jss;
		import injectSheet from './react-jss/injectSheet';
		export default {
			ThemeProvider, withTheme, createTheming,
			JssProvider, SheetsRegistry, jss, createGenerateClassNameDefault,
			injectSheet
		}
		`);
		res.end();
	});
	webserver.app.all('/modules/warning', async (_req, res) => {
		res.contentType('.js');
		res.write(`
		const warning = (condition, _, args) => { if (!condition) { console.log(args); } };
		export default warning`)
		res.end();
	});
	webserver.app.all('/modules/material-ui/core/styles/colorManipulator', async (_req, res) => {
		res.contentType('.js');
		const file = await fs.readFile(
			path.join(materialUICoreRoot, 'es/styles/colorManipulator.js'));
		res.write(rewriteEsModuleImports(file.toString()).replace(/process.env.NODE_ENV/g, '"development"'));
		res.end();
	});
	webserver.app.all('/shared/lib/shared-crypto.js', async (_req, res) => {
		await genSingleFileWebpackRoute(res, 'sharedCrypto', 
			path.join(PROJECT_ROOT, `shared/lib/shared-crypto.js`));
	});
	webserver.app.all('/shared/lib/browser-crypto.js', async (_req, res) => {
		await genSingleFileWebpackRoute(res, 'browserCrypto', 
			path.join(PROJECT_ROOT, `shared/lib/browser-crypto.js`));
	});
	webserver.app.all('/modules/react-jss/:module', async (req, res) => {
		const name = req.params.module;
		await genSingleFileWebpackRoute(res, name, 
			path.join(PROJECT_ROOT, `node_modules/react-jss/lib/${name}.js`));
	});
	webserver.app.all('/modules/theming', async (_req, res) => {
		await genSingleFileWebpackRoute(res, 'theming', 
			path.join(PROJECT_ROOT, 'node_modules/theming/dist/esm/index.js'));
	});
	webserver.app.all('/modules/material-ui/core/colors', async (_req, res) => {
		res.contentType('.js');
		res.write(await fs.readFile(path.join(materialUICoreRoot, 'es/colors/index.js')));
		res.end();
	});
	webserver.app.all('/modules/material-ui/styles', async (_req, res) => {
		res.contentType('.js');
		res.write(await fs.readFile(path.join(materialUICoreRoot, 'es/styles/index.js')));
		res.end();
	});
	webserver.app.all('/modules/material-ui/core/styles', async (_req, res) => {
		res.contentType('.js');
		res.write(await fs.readFile(path.join(materialUICoreRoot, 'es/styles/index.js')));
		res.end();
	});
	webserver.app.all('/modules/classnames', async (_req, res) => {
		res.contentType('.js');
		res.write(await fs.readFile(path.join(PROJECT_ROOT, 'node_modules/classnames/index.js')));
		res.end();
	});
	webserver.app.all('/modules/material-ui/Modal', async (_req, res) => {
		res.contentType('.js');
		const file = await fs.readFile(path.join(materialUICoreRoot, 'es/Modal/index.js'));
		const replaced = file.toString()
			.replace(/export { default } from '.\/Modal';/g, 
				'export { default } from \'./Modal2\';');
		res.write(replaced);
		res.end();
	});
	webserver.app.all('/modules/material-ui/:module', async (req, res, next) => {
		let component = req.params.module;
		const modals = [
			'isOverflowing',
			'manageAriaHidden',
			'ModalManager',
			'Modal2'
		];
		if (modals.indexOf(component) === -1) {
			return next();
		}
		if (component === 'Modal2') {
			component = 'Modal';
		}

		const { err, result } = await synchronizePromise(fs.readFile(path.join(
			PROJECT_ROOT, 'temp/', `${component}.js`
		)));
		if (!err) {
			res.contentType('.js');
			res.write(`${result}\n\n
			export default _${component}.default;`);
			res.end();
			return;
		}
	
		webpack({
			mode: "development",
			entry: path.join(materialUICoreRoot, 'Modal/', `${component}.js`),
			output: {
				library: `_${component}`,
				path: path.join(PROJECT_ROOT, 'temp/'),
				filename: `${component}.js`
			}
		}, async (err) => {
			if (err) {
				res.status(500);
				res.end();
			} else {
				res.contentType('.js');
				const { err, result: content } = await synchronizePromise(fs.readFile(path.join(
					PROJECT_ROOT, 'temp/', `${component}.js`
				)));
				if (err) {
					res.status(500);
					res.end();
					return;
				}
				res.write(`${content}\n\n
				export default _${component}.default;`);
				res.end();
			}
		});
	});
	webserver.app.all('/modules/material-ui/core/:module', async (req, res, next) => {
		const component = req.params.module;
		const styles = [
			'createGenerateClassName', 'createMuiTheme', 
			'jssPreset', 'MuiThemeProvider',
			'createStyles', 'withStyles', 'withTheme'
		];
		if (styles.indexOf(component) === -1) {
			return next();
		}

		const { err, result } = await synchronizePromise(fs.readFile(path.join(
			PROJECT_ROOT, 'temp/', `${component}.js`
		)));
		if (!err) {
			res.contentType('.js');
			res.write(`${result}\n\n
			export default _${component}.default;`);
			res.end();
			return;
		}
	
		webpack({
			mode: "development",
			entry: path.join(materialUICoreRoot, 'styles/', `${component}.js`),
			output: {
				library: `_${component}`,
				path: path.join(PROJECT_ROOT, 'temp/'),
				filename: `${component}.js`
			}
		}, async (err) => {
			if (err) {
				res.status(500);
				res.end();
			} else {
				res.contentType('.js');
				const { err, result: content } = await synchronizePromise(fs.readFile(path.join(
					PROJECT_ROOT, 'temp/', `${component}.js`
				)));
				if (err) {
					res.status(500);
					res.end();
					return;
				}
				res.write(`${content}\n\n
				export default _${component}.default;`);
				res.end();
			}
		});
	});
	webserver.app.all('/modules/material-ui/:module', async (req, res, next) => {
		const component = req.params.module;
		const styles = [
			'createGenerateClassName', 'createMuiTheme', 
			'jssPreset', 'MuiThemeProvider',
			'createStyles', 'withStyles', 'withTheme'
		];
		if (styles.indexOf(component) === -1) {
			return next();
		}

		const { err, result } = await synchronizePromise(fs.readFile(path.join(
			PROJECT_ROOT, 'temp/', `${component}.js`
		)));
		if (!err) {
			res.contentType('.js');
			res.write(`${result}\n\n
			export default _${component}.default;`);
			res.end();
			return;
		}
	
		webpack({
			mode: "development",
			entry: path.join(materialUICoreRoot, 'styles/', `${component}.js`),
			output: {
				library: `_${component}`,
				path: path.join(PROJECT_ROOT, 'temp/'),
				filename: `${component}.js`
			}
		}, async (err) => {
			if (err) {
				res.status(500);
				res.end();
			} else {
				res.contentType('.js');
				const { err, result: content } = await synchronizePromise(fs.readFile(path.join(
					PROJECT_ROOT, 'temp/', `${component}.js`
				)));
				if (err) {
					res.status(500);
					res.end();
					return;
				}
				res.write(`${content}\n\n
				export default _${component}.default;`);
				res.end();
			}
		});
	});
	webserver.app.all('/modules/material-ui/:module', async (req, res) => {
		const component = req.params.module;
		const { err, result } = await synchronizePromise(fs.readFile(path.join(
			PROJECT_ROOT, 'temp/', `${component}.js`
		)));
		if (!err) {
			res.contentType('.js');
			res.write(`${result}\n\n
			export default _${component}.default;`);
			res.end();
			return;
		}

		webpack({
			mode: "development",
			entry: path.join(materialUICoreRoot, component, 'index.js'),
			output: {
				library: `_${component}`,
				path: path.join(PROJECT_ROOT, 'temp/'),
				filename: `${component}.js`
			}
		}, async (err) => {
			if (err) {
				res.status(500);
				res.end();
			} else {
				res.contentType('.js');
				const { err, result: content } = await synchronizePromise(fs.readFile(path.join(
					PROJECT_ROOT, 'temp/', `${component}.js`
				)));
				if (err) {
					res.status(500);
					res.end();
					return;
				}
				res.write(`${content}\n\n
				export default _${component}.default;`);
				res.end();
			}
		});
	});
	webserver.app.use(serve(path.join(base, 'src/'), {
		rewrite(content, filePath) {
			if (filePath.endsWith('.js')) {
				return commonjsToEs6(content);
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
				return commonjsToEs6(content);
			}
			return content;
		}
	}));
	webserver.app.use(serve(path.join(PROJECT_ROOT, 'shared/components/'), {
		prefix: '/shared/components',
		rewrite(content, filePath) {
			if (filePath.endsWith('.js')) {
				return commonjsToEs6(content);
			}
			return content;
		}
	}));
	webserver.app.use(serve(path.join(PROJECT_ROOT, 'shared/'), {
		prefix: '/shared',
		rewrite(content, filePath) {
			if (filePath.endsWith('.js')) {
				return commonjsToEs6(content);
			}
			return content;
		}
	}));
}