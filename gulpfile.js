const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommonJs = require('rollup-plugin-commonjs');
const htmlMinifier = require('html-minifier');
const htmlTypings = require('html-typings');
const uglifyCSS = require('uglifycss');
const uglify = require('uglify-es');
const rollup = require('rollup');
const fs = require('fs-extra');
const gulp = require('gulp');
const path = require('path');
const glob = require('glob');

/**
 * Generates a task with given description
 * 
 * @param {string|any} description - The description of the task
 * @param {any} [toRun] - The function to execute
 * 
 * @returns {any} The task
 */
function genTask(description, toRun) {
	toRun.description = description;
	return toRun;
}

/**
 * Generates a function with a dynamic name
 * 
 * @param {string} name - The name of the function
 * @param {Function} target - The content of the function
 * 
 * @returns {(done: (error?: any) => void) => any} The function with the new name
 */
function dynamicFunctionName(name, target) {
	const fn = new Function('target', `return function ${name}(){ return target() }`);
	return fn(target);
}

/**
 * Generates an async function with a dynamic name
 * 
 * @param {string} name - The name of the function
 * @param {Function} target - The content of the function
 * 
 * @returns {(done: (error?: any) => void) => any} The function with the new name
 */
function dynamicFunctionNameAsync(name, target) {
	const fn = new Function('target', `return async function ${name}(){ return await target() }`);
	return fn(target);
}

/**
 * Capitalizes a string
 * 
 * @param {string} str - The string to capitalize
 * 
 * @returns {string} The capitalized string
 */
function capitalize(str) {
	return `${str[0].toUpperCase()}${str.slice(1)}`;
}

/**
 * Finds files with a glob pattern
 * 
 * @param {string} pattern - The pattern to use to search
 * 
 * @returns {Promise<string[]>} The found files
 */
function findWithGlob(pattern) {
	return new Promise((resolve, reject) => {
		glob(pattern, (err, matches) => {
			if (err) {
				reject(err);
			} else {
				resolve(matches);
			}
		});
	});
}

/**
 * Converts dashes to an uppercase char
 * 
 * @param {string} str - The string to transform
 * 
 * @returns {string} The transformed string
 */
function dashesToUppercase(str) {
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

/* Shared */
(() => {
	/**
	 * Converts a JSON object string to typings
	 * 
	 * @param {string} str - The initial name
	 * 
	 * @returns {string} The new string
	 */
	function stringToType(str) {
		return str.replace(/":( )?"((\w|#|\.|\|)+)"/g, '": $2');
	}
	
	/**
	 * Formats a JSON object
	 * 
	 * @param {string} str - The input string
	 * 
	 * @returns {string} The prettified string
	 */
	function prettyify(str) {
		if (str === '{}') {
			return '{}';
		}
		str = str
			.replace(/"((#|\.)?\w+)": ((\w|\|)+),/g, '"$1": $3,')
			.replace(/"((#|\.)?\w+)": ((\w|\|)+)},/g, '"$1": $3\n},')
			.replace(/"(\w+)":{/g, '"$1":{\n')
			.replace(/\n},"/g, '\n},\n"')
			.replace(/{\n}/g, '{ }')
			.replace(/"(\w+)": (\w+)}}/g, '\t"$1": $2\n}\n}')
			.replace(/{"/g, '{\n"')
			.replace(/:"{ }",/, ':{ },\n')
			.replace(/,/g, ';')
			.replace(/(\s+)\}/g, ';\n}')
		const split = str.split('\n');
		return split.join('\n');
	}

	/**
	 * Formats a typings object into a string
	 * 
	 * @param {{[key: string]: string}} typings - The query object
	 * 
	 * @returns {string} The query map
	 */
	function formatTypings(typings) {
		return prettyify(stringToType(JSON.stringify(typings, null, '\t')))
	}

	/**
	 * Creates a component query map for given component
	 * 
	 * @param {string} name - The name of the component
	 * @param {HTMLTypings.TypingsObj} queryObj - The query object
	 * 
	 * @returns {string} The query map
	 */
	function createComponentQueryMap(name, queryObj) {
		const {
			// @ts-ignore
			classes, ids, selectors, tags
		} = queryObj;
		const prefix = capitalize(dashesToUppercase(name));
		return `export type ${prefix}SelectorMap = ${formatTypings(selectors)}

export type ${prefix}IDMap = ${formatTypings(ids)}

export type ${prefix}ClassMap = ${formatTypings(classes)}

export type ${prefix}TagMap = ${formatTypings(tags)}`
	}

	gulp.task('defs.components', genTask('Generates ID definitions for components', async () => {
		await Promise.all((await findWithGlob('shared/components/**/*.html.ts')).map(async (fileName) => {
			const componentName = fileName.split('/').pop().split('.')[0];
			const defs = await htmlTypings.extractFileTypes(fileName, true);
			await fs.writeFile(path.join(path.dirname(fileName), `${componentName}-querymap.d.ts`),
				createComponentQueryMap(componentName, defs));
		}));
	}));

	gulp.task('defs', gulp.parallel('defs.components'));
})();

/* Dashboard */
(() => {
	const SRC_DIR = path.join(__dirname, 'server/app/actions/server/webserver/client/src/');
	const BUILD_DIR = path.join(__dirname, 'server/app/actions/server/webserver/client/build/');
	//TODO: add dashboard route when work started on it
	const ROUTES = ['login'];

	gulp.task('dashboard.bundle.js', genTask('Bundles the TSX files into a single bundle',
		gulp.series(
			gulp.parallel(
				async function minifyHTML() {
					const files = await findWithGlob('shared/components/**/*.html.js');
					await Promise.all(files.map(async (file) => {
						const content = await fs.readFile(file, {
							encoding: 'utf8'
						});
						const startIndex = content.indexOf('`') + 1;
						const endIndex = content.lastIndexOf('`');
						const html = content.slice(startIndex, endIndex);
						const minified = htmlMinifier.minify(html, {
							collapseWhitespace: true,
							caseSensitive: true,
							minifyCSS: true,
							minifyJS: true
						});

						const replaced = content.slice(0, startIndex) +
							minified + content.slice(endIndex);
						await fs.writeFile(file, replaced, {
							encoding: 'utf8'
						});
					}));
				},
				async function minifyCSS() {
					const files = await findWithGlob('shared/components/**/*.css.js');
					await Promise.all(files.map(async (file) => {
						const content = await fs.readFile(file, {
							encoding: 'utf8'
						});
						const startIndex = content.indexOf('<style>') + '<style>'.length;
						const endIndex = content.lastIndexOf('</style>');
						const html = content.slice(startIndex, endIndex);
						const minified = uglifyCSS.processString(html, { });

						const replaced = content.slice(0, startIndex) +
							minified + content.slice(endIndex);
						await fs.writeFile(file, replaced, {
							encoding: 'utf8'
						});
					}));
				}
			),
			gulp.parallel(...ROUTES.map((route) => {
				const input = path.join(SRC_DIR, 'entrypoints/', route, `${route}-page.js`);
				const output = path.join(BUILD_DIR, 'entrypoints/', route, `${route}-page.js`);

				return gulp.series(
					dynamicFunctionNameAsync(`bundleJS${capitalize(route)}`, async () => {
						const bundle = await rollup.rollup({
							input,
							onwarn(warning) {
								if (typeof warning !== 'string' && warning.loc) {
									const line = warning.loc.line;
									if (line === 1 || line === 7) {
										//Typescript inserted helper method, ignore it
										return;
									}
								}
								console.log(warning);
							},
							plugins: [
								rollupResolve({
									module: true,
									browser: true
								}),
								rollupCommonJs({
									namedExports: {
										'node_modules/js-sha512/src/sha512.js': [
											'sha512', 
											'sha512_256'
										],
										'node_modules/aes-js/index.js': [
											'AES',
											'Counter',
											'ModeOfOperation',
											'utils',
											'padding',
											'_arrayTest'
										]
									}
								})
							]
						});

						await bundle.write({
							format: 'iife',
							file: output
						});
					}),
					dynamicFunctionNameAsync(`minifyJS${capitalize(route)}`, async () => {
						const file = await fs.readFile(output, {
							encoding: 'utf8'
						});
						const result = uglify.minify(file, {
							keep_classnames: true,
							ecma: 6
						});
						if (result.error) {
							throw result.error;
						}
						await fs.writeFile(output, result.code, {
							encoding: 'utf8'
						});
					}))
			})))));

	gulp.task('dashboard.bundle', gulp.parallel(
		'dashboard.bundle.js'
	));

	gulp.task('dashboard', gulp.parallel(
		'dashboard.bundle'
	));
})();