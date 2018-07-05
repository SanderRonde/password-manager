import { ExitCodeCapturer } from "./log";

type CustomExitFunction = ((code: number) => never) & {
	__isOverridden: boolean;
}

export function hookIntoExit(reject: (err: Error) => void) {
	const capturer = new ExitCodeCapturer(reject);
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