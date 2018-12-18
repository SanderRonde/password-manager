/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent, config, Props, ComplexType, PROP_TYPE } from '../../../lib/webcomponents';
import { HorizontalCenterer } from '../horizontal-centerer/horizontal-centerer';
import { VerticalCenterer } from '../vertical-centerer/vertical-centerer';
import { PaperDialogIDMap } from './paper-dialog-querymap';
import { PaperDialogHTML } from './paper-dialog.html';
import { PaperDialogCSS } from './paper-dialog.css';
import { MDCard } from '../md-card/md-card';

const enum DISPLAY_MODE {
	//Fill the page with just the content
	FILL_CONTENT,
	//Cover a big part of the page regardless
	// of content size
	COVER
}

@config({
	is: 'paper-dialog',
	css: PaperDialogCSS,
	html: PaperDialogHTML,
	dependencies: [
		HorizontalCenterer,
		VerticalCenterer,
		MDCard
	]
})
export class PaperDialog extends ConfigurableWebComponent<PaperDialogIDMap> {
	props = Props.define(this, {
		reflect: {
			mode: {
				type: ComplexType<DISPLAY_MODE>(),
				value: DISPLAY_MODE.FILL_CONTENT
			},
			title: PROP_TYPE.STRING,
			visible: {
				type: PROP_TYPE.BOOL,
				value: false
			}
		}
	});

	show() {
		//TODO: disable scrollbars
	}

	hide() {
		//TODO: enable scrollbars
	}
}