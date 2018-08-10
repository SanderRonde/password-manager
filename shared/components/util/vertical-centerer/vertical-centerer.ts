/// <reference path="../../../types/elements.d.ts" />
import { defineProps, PROP_TYPE, config } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from "../../../lib/webcomponents";
import { VerticalCentererIDMap } from './vertical-centerer-querymap';
import { VerticalCentererHTML } from './vertical-centerer.html';
import { VerticalCentererCSS } from './vertical-centerer.css';

@config({
	is: 'vertical-centerer',
	css: VerticalCentererCSS,
	html: VerticalCentererHTML
})
export class VerticalCenterer extends ConfigurableWebComponent<VerticalCentererIDMap> {
	props = defineProps(this, {
		reflect: {
			fullscreen: PROP_TYPE.BOOL
		}
	});
}