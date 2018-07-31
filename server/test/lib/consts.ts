import { initCommander } from '../../app/main';

function getDefaultHelp() {
	let helpText: string = '';
	initCommander({ handled: true }).outputHelp((text: string) => {
		helpText = text;
		return '';
	});
	return helpText;
}

export const DEFAULT_HELP = getDefaultHelp();

export const EXECUTABLE_SPECIFIC_HELP = DEFAULT_HELP
	.replace(/ \[options\]/, 'main [options]');

export const DEFAULT_ARGS = ['/usr/bin/node', './app/main.js'];