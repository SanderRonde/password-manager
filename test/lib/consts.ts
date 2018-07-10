import { MainExports } from '../../app/main';
import importFresh = require('import-fresh');

const { initCommander } = importFresh('../../app/main') as MainExports;

function getDefaultHelp() {
	let helpText: string = '';
	initCommander({
		write(..._args: any[]) {}
	}, { handled: true }).outputHelp((text: string) => {
		helpText = text;
		return '';
	});
	return helpText;
}

export const DEFAULT_HELP = getDefaultHelp();