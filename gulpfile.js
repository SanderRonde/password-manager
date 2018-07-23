const cleanCss = require('gulp-clean-css');
const rollup = require('rollup');
const fs = require('fs-extra');
const gulp = require('gulp');
const path = require('path');

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

/* Dashboard */
(() => {
	const SRC_DIR = path.join(__dirname, 'server/app/actions/server/webserver/client/src/');
	const BUILD_DIR = path.join(__dirname, 'server/app/actions/server/webserver/client/build/');
	const ROUTES = ['dashboard', 'login'];

	/**
	 * Combine JS files into a single bundle and output it
	 * 
	 * @param {string} input - The entrypoint
	 * @param {string} output - The output location
	 */
	async function bundleJS(input, output) {
		const bundle = await rollup.rollup({
			input: input,
			inlineDynamicImports: true
		});
	
		await fs.mkdirp(path.dirname(output));
		await bundle.write({
			format: 'iife',
			file: output
		});
	}

	gulp.task('dashboard.bundle.js', genTask('Bundles the TSX files into a single bundle',
		gulp.parallel(...ROUTES.map((route) => {
			const input = path.join(SRC_DIR, 'entrypoints/', route, `${route}.js`);
			const output = path.join(BUILD_DIR, 'entrypoints/', route, `${route}.js`);
			return dynamicFunctionNameAsync(`bundleJS${capitalize(route)}`, async () => {
				await bundleJS(input, output);
			});
		}))));

	gulp.task('dashboard.bundle.css', genTask('Bundles the CSS files into a single bundle',
		gulp.parallel(...ROUTES.map((route) => {
			const input = path.join(SRC_DIR, 'entrypoints/', route, `${route}.css`);
			const output = path.join(BUILD_DIR, 'entrypoints/', route);
			return dynamicFunctionName(`bundleCSS${capitalize(route)}`, () => {
				return gulp.src(input)
					.pipe(cleanCss({ }))
					.pipe(gulp.dest(output));
			});
		}))));

	gulp.task('dashboard.bundle.html', genTask('Bundles the CSS files into a single bundle',
		gulp.parallel(...ROUTES.map((route) => {
			const input = path.join(SRC_DIR, 'entrypoints/', route, `${route}.html`);
			const output = path.join(BUILD_DIR, 'entrypoints/', route);
			return dynamicFunctionName(`copyHTML${capitalize(route)}`, () => {
				return gulp.src(input)
					.pipe(gulp.dest(output));
			});
		}))));

	gulp.task('dashboard', gulp.parallel(
		'dashboard.bundle.js', 
		'dashboard.bundle.css',
		'dashboard.bundle.html'
	));
})();