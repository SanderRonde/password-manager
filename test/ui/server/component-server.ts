import { ConfigurableWebComponent } from '../../../shared/lib/webcomponents';
const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommonJs = require('rollup-plugin-commonjs');
import * as requireHacker from 'require-hacker';
import * as babel from 'babel-core';
import * as rollup from 'rollup';
import * as fs from 'fs-extra';
import * as glob from 'glob';
import * as path from 'path';

function synchronizePromise<T>(prom: Promise<T>): Promise<{
	err: Error;
	result: null;
} | {
	err: null;
	result: T;
}> {
	return new Promise((resolve) => {
		prom.catch((err) => {
			resolve({
				err,
				result: null
			});
		}).then((result) => {
			resolve({
				err: null,
				result: result as T
			});
		});
	});
}

async function transformToEs6(filePath: string, name: string): Promise<void> {
	const outfile = path.join(__dirname, `../../../temp/${name}.js`);
	const { err } = await synchronizePromise(fs.readFile(outfile, {
		encoding: 'utf8'
	}));
	if (!err) {
		return;
	}
	const content = await fs.readFile(filePath, {
		encoding: 'utf8'
	});
	const transformed = babel.transform(content, {
		plugins: ['transform-es2015-modules-commonjs']
	});
	await fs.writeFile(outfile, transformed.code, {
		encoding: 'utf8'
	});
}

async function transformToCommonJS(filePath: string): Promise<string> {
	const content = await fs.readFile(filePath, {
		encoding: 'utf8'
	});
	const transformed = babel.transform(content, {
		plugins: ['transform-commonjs-es2015-modules']
	});
	return transformed.code!;
}

async function rollupComponent(filePath: string, componentName: string, bundleName: string) {
	const outputLocation = path.join(__dirname, '../../../temp/', `${bundleName}.js`);
	const { err, result } = await synchronizePromise(fs.readFile(outputLocation, {
		encoding: 'utf8'
	}));
	if (!err) {
		return result!;
	}
	const commonComponent = (await transformToCommonJS(filePath))
		.replace(/export \w+ (\w+) = (\w+)/, 'export { $1 }');
	const tempFile = filePath + '.temp';
	await fs.writeFile(tempFile, commonComponent, {
		encoding: 'utf8'
	});
	debugger;
	const bundle = await rollup.rollup({
		input: tempFile,
		onwarn() { },
		plugins: [
			rollupResolve({
				module: true,
				browser: true
			}),
			rollupCommonJs()
		]
	});
	await bundle.write({
		format: 'iife',
		file: outputLocation,
		name: componentName
	});
	await fs.unlink(tempFile);
	return await fs.readFile(outputLocation, {
		encoding: 'utf8'
	});
}

const requireMap: Map<string, any> = new Map();
async function requireES6File<T>(filePath: string, name: string): Promise<T> {
	await transformToEs6(filePath, name);
	if (requireMap.has(filePath)) {
		return requireMap.get(filePath)!;
	}
	const outfile = path.join(__dirname, `../../../temp/${name}.js`);
	const required = require(outfile);
	requireMap.set(filePath, required);
	return required;
}

function getComponentFiles() {
	return new Promise<string[]>((resolve, reject) => {
		glob(path.join(__dirname, '../../../', 'shared/components') +
			'/**/*.js', async (err, matches) => {
				if (err) {
					reject(err);
					return;
				}
				matches = matches.filter((match) => {
					return !match.endsWith('.html.js') &&
						!match.endsWith('.css.js');
				});
				resolve(matches);
			});
	});
}

async function requireComponentFiles(files: string[]) {
	const name = 'litHtml';
	await requireES6File(path.join(__dirname, '../../../', 'node_modules/lit-html/lit-html.js'), name);
	const litHTMLPath = path.join(__dirname, '../../../temp/', `${name}.js`);
	const commonjsJSEncrypt = path.join(__dirname, '../../../server/app/libraries/jsencrypt.js');
	const resolver = requireHacker.resolver((reqPath: string, srcModule: any) => {
		const resolvedPath: string = requireHacker.resolve(reqPath, srcModule);
		if (reqPath === 'lit-html') {
			return litHTMLPath;
		}
		if (/shared.libraries.jsencrypt\.js/.exec(resolvedPath)) {
			return commonjsJSEncrypt;
		}
		return undefined;
	});
	interface ExtendedProcess extends NodeJS.Process {
		HTMLElement: typeof HTMLElement;
	}
	(<ExtendedProcess>process).HTMLElement = (class HTMLElement {
	}) as any;
	const required = files.map(file => ({
		src: file,
		content: require(file)
	}));
	resolver.unmount();
	return required;
}

function filterComponents(candidates: {
	src: string;
	content: any;
}[]): {
	src: string;
	name: string;
	content: typeof ConfigurableWebComponent;
}[] {
	const components: {
		src: string;
		name: string;
		content: typeof ConfigurableWebComponent;
	}[] = candidates.map(({ content, src }) => {
		for (const key in content) {
			const value = content[key];
			if (!('config' in value))
				continue;
			if (!('is' in value))
				continue;
			return {
				src,
				content: value,
				name: key
			};
		}
		return null;
	}).filter((val) => {
		return val !== null;
	}) as any;
	return components;
}

async function generateComponentMap() {
	const files = await getComponentFiles();
	const required = await requireComponentFiles(files);
	return filterComponents(required);
}

function dashesToUppercase(str: string) {
	let newStr = '';
	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		if (char === '-') {
			newStr += str[i + 1].toUpperCase();
			i += 1;
		} else {
			newStr += char;
		}
	}
	return newStr;
}

export async function getComponent(name: string, testSrc: string) {
	const componentHTMLFile = await fs.readFile(
		path.join(testSrc, `${name}.html`), {
			encoding: 'utf8'
		}).catch(() => {
			throw new Error('Failed to open associated HTML file');
		});

	const components = await generateComponentMap();
	const component = components.filter((component) => {
		return component.content.config.is === name;
	})[0];
	if (!component) {
		throw new Error(`Failed to find element with name " ${name}"`);
	}

	//Convert the component's source code
	return {
		body: componentHTMLFile,
		bundle: await rollupComponent(component.src, 
			dashesToUppercase(name), `${name}-commonjs`),
		bundleName: dashesToUppercase(name),
		component: component
	}
}