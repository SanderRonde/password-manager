/// <reference path="../../../types/elements.d.ts" />
import { ConfigurableWebComponent, config, Props, PROP_TYPE } from "../../../lib/webcomponents";
import { HorizontalCentererIDMap } from './horizontal-centerer-querymap';
import { HorizontalCentererHTML } from './horizontal-centerer.html';
import { HorizontalCentererCSS } from './horizontal-centerer.css';

@config({
	is: 'horizontal-centerer',
	css: HorizontalCentererCSS,
	html: HorizontalCentererHTML
})
export class HorizontalCenterer extends ConfigurableWebComponent<HorizontalCentererIDMap> { 
	props = Props.define(this, {
		reflect: {
			fullscreen: PROP_TYPE.BOOL
		}
	});
}