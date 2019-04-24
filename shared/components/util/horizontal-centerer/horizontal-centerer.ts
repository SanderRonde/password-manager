/// <reference path="../../../types/elements.d.ts" />
import { HorizontalCentererIDMap, HorizontalCentererClassMap } from './horizontal-centerer-querymap';
import { ConfigurableWebComponent, config, Props, PROP_TYPE } from "wclib";
import { HorizontalCentererHTML } from './horizontal-centerer.html';
import { HorizontalCentererCSS } from './horizontal-centerer.css';

@config({
	is: 'horizontal-centerer',
	css: HorizontalCentererCSS,
	html: HorizontalCentererHTML
})
export class HorizontalCenterer extends ConfigurableWebComponent<{
	IDS: HorizontalCentererIDMap;
	CLASSES: HorizontalCentererClassMap;
}> { 
	props = Props.define(this, {
		reflect: {
			fullscreen: PROP_TYPE.BOOL
		}
	});
}