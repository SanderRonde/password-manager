import { ExitCodeCapturer, LogCapturer } from "./log";
import { MainExports } from "../../app/main";
import importFresh = require('import-fresh');

type CustomExitFunction = ((code: number) => never) & {
	__isOverridden: boolean;
}

export function hookIntoExit() {
	const capturer = new ExitCodeCapturer();
	if ((process.exit as CustomExitFunction).__isOverridden) {
		const originalExit = process.exit;
		process.exit = ((code: number) => {
			originalExit(code);
			capturer.onExit.call(capturer, code)
		}) as (code: number) => never;
		(process.exit as CustomExitFunction).__isOverridden = true;
	} else {
		process.exit = ((code) => {
			capturer.onExit.call(capturer, code);
		}) as (code: number) => never;
		(process.exit as CustomExitFunction).__isOverridden = true;
	}
	return capturer;
}

export function finalizeLogs(log: LogCapturer, exit: ExitCodeCapturer) {
	log.finalize();
	exit.finalize();
}

export function captureLogs() {
	const exit = hookIntoExit();
	const log = new LogCapturer()
	return {
		exit, log
	};
}

export function getFreshMain(): MainExports {
	return importFresh('../../app/main');
}