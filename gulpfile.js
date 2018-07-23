const ts = require('gulp-typescript');
const gulp = require('gulp');

/**
 * Generates a task with given description
 * 
 * @param {string|any} description - The description of the task
 * @param {any} [toRun] - The function to execute
 */
function genTask(description, toRun) {
	toRun.description = description;
	return toRun;
}

/* Compilation */
(() => {
	gulp.task('compileServer', genTask('Compiles the typescript for /server',
		function compileServer() {
			return new Promise((resolve, reject) => {
				// @ts-ignore
				const project = ts.createProject('./server/tsconfig.json');
				const proj = project.src().pipe(project());
				proj.once('error', () => { 
					reject('Error(s) thrown during compilation');
				});
				proj.js.pipe(gulp.dest('./server/')).once('end', () => {
					resolve(null);
				});
			});
		}
	));

	gulp.task('compileClientDashboard', genTask('Compiles the typescript for the dashboard',
		function compileClientDashboard() {
			return new Promise((resolve, reject) => {
				// @ts-ignore
				const dir = './server/app/actions/server/webserver/client/src';
				const project = 
					ts.createProject(`${dir}/tsconfig.json`);
				const proj = project.src().pipe(project());
				proj.once('error', () => { 
					reject('Error(s) thrown during compilation');
				});
				proj.js.pipe(gulp.dest(`${dir}/`)).once('end', () => {
					resolve(null);
				});
			});
		}
	));
})();