const rollupResolve = require('rollup-plugin-node-resolve');
const rollup = require('rollup');
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

// /**
//  * Generates a function with a dynamic name
//  * 
//  * @param {string} name - The name of the function
//  * @param {Function} target - The content of the function
//  * 
//  * @returns {(done: (error?: any) => void) => any} The function with the new name
//  */
// function dynamicFunctionName(name, target) {
// 	const fn = new Function('target', `return function ${name}(){ return target() }`);
// 	return fn(target);
// }

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
	//TODO: add dashboard route when work started on it
	const ROUTES = ['login'];

	gulp.task('dashboard.bundle.js', genTask('Bundles the TSX files into a single bundle',
		gulp.parallel(...ROUTES.map((route) => {
			const input = path.join(SRC_DIR, 'entrypoints/', route, `${route}-page.js`);
			const output = path.join(BUILD_DIR, 'entrypoints/', route, `${route}-page.js`);

			return dynamicFunctionNameAsync(`bundleJS${capitalize(route)}`, async () => {
				const bundle = await rollup.rollup({
					input,
					onwarn(warning) {
						if (typeof warning !== 'string' && warning.loc) {
							const line = warning.loc.line;
							if (line === 1) {
								//Typescript inserted helper method, ignore it
								return;
							}
						}
						console.log(warning);
					},
					plugins: [
						rollupResolve({
							module: true,
							browser: true,
							only: ['lit-html'],
							modulesOnly: true
						})
					]
				});

				await bundle.write({
					format: 'iife',
					file: output
				});
			});
		}))));

	gulp.task('dashboard', gulp.parallel(
		'dashboard.bundle.js'
	));
})();