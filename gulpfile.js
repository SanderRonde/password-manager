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
	gulp.task('compile', genTask('Compiles the typescript',
		gulp.series('updateTsIdMaps', gulp.parallel(
			function compileApp() {
				return new Promise((resolve, reject) => {
					const project = ts.createProject('tsconfig.json');
					const proj =  project.src().pipe(project());
					proj.once('error', () => { 
						reject('Error(s) thrown during compilation');
					});
					proj.js.pipe(gulp.dest('./')).once('end', () => {
						resolve(null);
					});
				});
			}
		))));
})();