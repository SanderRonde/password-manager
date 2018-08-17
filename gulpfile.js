const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommonJs = require('rollup-plugin-commonjs');
const requireHacker = require('require-hacker');
const htmlMinifier = require('html-minifier');
const htmlTypings = require('html-typings');
const uglifyCSS = require('uglifycss');
const uglify = require('uglify-es');
const babel = require('babel-core');
const rollup = require('rollup');
const fs = require('fs-extra');
const gulp = require('gulp');
const path = require('path');
const glob = require('glob');
const md5 = require('md5');

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
	
	/**
	 * Strips invalid values from a query map (such as ${classNames(...
	 * 
	 * @param {{[key: string]: string;}} queryObj - The query object
	 * 
	 * @returns {HTMLTypings.TypingsObj} The query map
	 */
	function stripInvalidValues(obj) {
		const newObj = {};
		for (const key in obj) {
			if (obj[key].indexOf('${') === -1 &&
				key.indexOf('${') === -1) {
					newObj[key] = obj[key];
				}
		}
		return newObj;
	}

	/**
	 * Strips invalid values from a query map obj (such as ${classNames(...
	 * 
	 * @param {HTMLTypings.TypingsObj} queryObj - The query object
	 * 
	 * @returns {HTMLTypings.TypingsObj} The query map
	 */
	function stripInvalidValuesObj(queryObj) {
		return {
			classes: stripInvalidValues(queryObj.classes),
			ids: stripInvalidValues(queryObj.ids),
			selectors: stripInvalidValues(queryObj.selectors),
			modules: queryObj.modules,
			tags: stripInvalidValues(queryObj.tags || {})
		}
	}

	gulp.task('defs.components', genTask('Generates ID definitions for components', async () => {
		await Promise.all((await findWithGlob('shared/components/**/*.html.ts')).map(async (fileName) => {
			const componentName = fileName.split('/').pop().split('.')[0];
			const defs = await htmlTypings.extractFileTypes(fileName, true);
			await fs.writeFile(path.join(path.dirname(fileName), `${componentName}-querymap.d.ts`),
				createComponentQueryMap(componentName, 
					stripInvalidValuesObj(defs)));
		}));
	}));

	gulp.task('defs', gulp.parallel('defs.components'));
})();

/* Dashboard */
(() => {
	const SRC_DIR = path.join(__dirname, 'server/app/actions/server/webserver/client/src/');
	const BUILD_DIR = path.join(__dirname, 'server/app/actions/server/webserver/client/build/');
	const ROUTES = ['login', 'dashboard'];

	gulp.task('dashboard.bundle.serviceworker', genTask('Bundles the serviceworker',
		gulp.series(
			async function rolupServiceWorker() {
				const input = path.join(SRC_DIR, `serviceworker.js`);
				const output = path.join(BUILD_DIR, `serviceworker.js`);	

				const bundle = await rollup.rollup({
					input,
					onwarn(warning) {
						if (typeof warning !== 'string' && warning.code === 'THIS_IS_UNDEFINED') {
							//Typescript inserted helper method, ignore it
							return;
						}
						console.log(warning);
					},
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
					file: output
				});
			}, 
			async function minifyServiceWorker() {
				const file = await fs.readFile(
					path.join(BUILD_DIR, `serviceworker.js`), {
						encoding: 'utf8'
					});
				const result = uglify.minify(file, {
					keep_classnames: true,
					ecma: 6
				});
				if (result.error) {
					throw result.error;
				}
				await fs.writeFile(path.join(BUILD_DIR, `serviceworker.js`), 
					result.code, {
						encoding: 'utf8'
					});
			}
		)));

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
			gulp.parallel('dashboard.bundle.serviceworker', ...ROUTES.map((route) => {
				const input = path.join(SRC_DIR, 'entrypoints/', route, `${route}-page.js`);
				const output = path.join(BUILD_DIR, 'entrypoints/', route, `${route}-page.js`);

				return gulp.series(
					dynamicFunctionNameAsync(`bundleJS${capitalize(route)}`, async () => {
						const bundle = await rollup.rollup({
							input,
							onwarn(warning) {
								if (typeof warning !== 'string' && warning.code === 'THIS_IS_UNDEFINED') {
									//Typescript inserted helper method, ignore it
									return;
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

	const CACHE_STATIC = [
		'/js/sw.js',
		'/css/offline_fonts.css'
	];
	
	const CACHE_PAGES = [
		'/login_offline',
		'/dashboard_offline'
	];
	
	const CACHE_COMPONENTS = [
		'/entrypoints/login/login-page.js',
		'/entrypoints/dashboard/dashboard-page.js'
	];

	function fakeRender(fn) {
		return new Promise((resolve) => {
			let content = '';
			fn({ cookies: {} }, {
				write(data) {
					content += data;
				},
				end() {
					resolve(content);
				}
			})
		});
	}

	gulp.task('dashboard.meta.versions', genTask('Generates the hashes for all ' +
		'cached files', async () => {
			const versions = {};
			await Promise.all([
				Promise.all(CACHE_STATIC.map(async (static) => {
					const filePath = path.join(__dirname, 
						'server/app/actions/server/webserver/client/static/',
						static.slice(1));
					const content = await fs.readFile(filePath, {
						encoding: 'utf8'
					});
					versions[static] = md5(content);
				})),
				Promise.all(CACHE_PAGES.map(async (page) => {
					const { RoutesDashboard } = require('./server/app/actions/server/webserver/server/routes/dashboard/routes-dashboard');
					const route = new RoutesDashboard({
						config: {}
					});
					const content = await fakeRender(route[page.slice(1)].bind(route))
					versions[page] = md5(content);
				})),
				Promise.all(CACHE_COMPONENTS.map(async (component) => {
					const filePath = path.join(__dirname, 
						'server/app/actions/server/webserver/client/build/',
						component.slice(1));
					const content = await fs.readFile(filePath, {
						encoding: 'utf8'
					});
					versions[component] = md5(content);
				}))
			]);
			await fs.writeFile(path.join(__dirname, 
				'server/app/actions/server/webserver/client/build/',
				'versions.json'), JSON.stringify(versions), {
					encoding: 'utf8'
				});
		}));

	gulp.task('dashboard.meta', gulp.parallel(
		'dashboard.meta.versions'
	));

	gulp.task('dashboard', gulp.series(
		'dashboard.bundle',
		'dashboard.meta'
	));
})();

/** Testing */
(() => {
	function synchronizePromise(prom) {
		return new Promise((resolve) => {
			prom.catch((err) => {
				resolve({
					err,
					result: null
				});
			}).then((result) => {
				resolve({
					err: null,
					result: result
				});
			});
		});
	}

	async function transformToEs6(filePath, name) {
		const outfile = path.join(__dirname, `temp/${name}.js`);
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

	async function requireES6File(filePath, name) {
		await transformToEs6(filePath, name);
		const outfile = path.join(__dirname, `temp/${name}.js`);
		const required = require(outfile);
		return required;
	}

	function getComponentFiles() {
		return new Promise((resolve, reject) => {
			glob(path.join(__dirname, 'shared/components') +
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

	async function requireComponentFiles(files) {
		const name = 'litHtml';
		await requireES6File(path.join(__dirname, 'node_modules/lit-html/lit-html.js'), name);
		const litHTMLPath = path.join(__dirname, 'temp/', `${name}.js`);
		const commonjsJSEncrypt = path.join(__dirname, 'server/app/libraries/jsencrypt.js');
		const resolver = requireHacker.resolver((reqPath, srcModule) => {
			const resolvedPath = requireHacker.resolve(reqPath, srcModule);
			if (reqPath === 'lit-html') {
				return litHTMLPath;
			}
			if (/shared.libraries.jsencrypt\.js/.exec(resolvedPath)) {
				return commonjsJSEncrypt;
			}
			return undefined;
		});
		process.HTMLElement = class HTMLElement {}
		const required = files.map(file => ({
			src: file,
			content: require(file)
		}));
		resolver.unmount();
		return required;
	}

	function filterComponents(candidates) {
		return candidates.map(({ content, src }) => {
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
		});
	}

	async function generateComponentMap() {
		const files = await getComponentFiles();
		const required = await requireComponentFiles(files);
		return filterComponents(required);
	}

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

	gulp.task('pretest.genbundles', genTask('Generates component bundles', 
		async function genComponentBundles() {
			const files = await getComponentFiles();
			await Promise.all(files.map(async (file) => {
				const bundle = await rollup.rollup({
					input: file,
					onwarn(warning) {
						if (typeof warning !== 'string' && warning.code === 'THIS_IS_UNDEFINED') {
							//Typescript inserted helper method, ignore it
							return;
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
				const outDir = path.join(__dirname, 'test/ui/served/bundles/');
				await fs.mkdirp(outDir);
				const outFile = path.join(outDir, path.basename(file));
				await bundle.write({
					format: 'iife',
					name: 'exported',
					file: outFile
				});
				const appendedFile = `${await fs.readFile(outFile)};
				exported[Object.getOwnPropertyNames(exported).filter((key) => {
					return key !== '__esModule' &&
						typeof exported[key] === 'function';
				})[0]].define();`;
				await fs.writeFile(outFile, appendedFile, {
					encoding: 'utf8'
				})
			}));
		}
	));

	gulp.task('pretest.genhtml', genTask('Generates servable HTML files',
		async function genWebPages() {
			const files = await findWithGlob(`${
				path.join(__dirname, 'test/ui/integration/components/')
			}/**/*.json`);
			await Promise.all(files.map(async (file) => {
				const config = JSON.parse(await fs.readFile(file, {
					encoding: 'utf8'
				}));
				const html = `${await fs.readFile(
					path.join(path.dirname(file), config.html), {
						encoding: 'utf8'
					})}
					<script src="bundles/${config.bundleName}.js"></script>`;
				await fs.writeFile(path.join(__dirname, 
					`test/ui/served/${config.name}.html`), html, {
						encoding: 'utf8'
					});
			}));
		}));

	gulp.task('pretest', gulp.series(
		'pretest.genbundles',
		'pretest.genhtml'
	));

	// gulp.task('pretest.common', genTask('Task that has to be run before testing', 
	// 	gulp.parallel(
	// 		async function getComponentMetadata() {
	// 			const components = await generateComponentMap();
	// 			const metadata = await Promise.all(components.map(async (component) => {
	// 				return {
	// 					src: component.src,
	// 					bundleName: dashesToUppercase(component.content.config.is),
	// 					component: {
	// 						config: {
	// 							is: component.content.config.is
	// 						},
	// 						is: component.content.config.is
	// 					}
	// 				}
	// 			}));
	// 			const outDir = path.join(__dirname,
	// 				'test/ui/fixtures/config');
	// 			await fs.mkdirp(outDir);
	// 			await fs.writeFile(path.join(outDir, 'meta.json'));
	// 		}
	// 	)));
})();