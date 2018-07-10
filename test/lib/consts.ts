import { getFreshMain } from "./util";

function getDefaultHelp() {
	let helpText: string = '';
	getFreshMain().initCommander({
		write(..._args: any[]) {}
	}, { handled: true }).outputHelp((text: string) => {
		helpText = text;
		return '';
	});
	return helpText;
}

export const DEFAULT_HELP = getDefaultHelp();