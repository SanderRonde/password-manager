/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent, config } from '../../../lib/webcomponents';
import { PaperDialogIDMap } from './paper-dialog-querymap';
import { PaperDialogHTML } from './paper-dialog.html';
import { PaperDialogCSS } from './paper-dialog.css';

@config({
	is: 'paper-dialog',
	css: PaperDialogCSS,
	html: PaperDialogHTML
})
export class PaperDialog extends ConfigurableWebComponent<PaperDialogIDMap> {
	
}