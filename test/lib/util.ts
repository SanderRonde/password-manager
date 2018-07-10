import { ExitCodeCapturer, LogCapturer } from "./log";

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

export function captureLogs(handler: (data: { 
	log: LogCapturer;
	exit: ExitCodeCapturer;
}) => Promise<any>) {
	return new Promise(async (resolve, reject) => {
		const exit = hookIntoExit(reject);
		const log = new LogCapturer(reject)

		await handler({log, exit});

		await log.finalize();
		await exit.finalize();

		resolve();
	});
}