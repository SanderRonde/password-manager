/// <reference path="../../../types/elements.d.ts" />
import { defineProps, PROP_TYPE, genIs, WebComponent, ComponentIs, WebComponentInterface } from '../../../lib/webcomponent-util';
import { VerticalCentererIDMap } from './vertical-centerer-querymap';
import { VerticalCentererHTML } from './vertical-centerer.html';

export class VerticalCenterer extends WebComponent<VerticalCentererIDMap> implements WebComponentInterface {
	static is: ComponentIs = genIs('vertical-centerer', VerticalCenterer);
	static get cssProvider() {
		return import('./vertical-centerer.css').then((mod) => {
			return mod.VerticalCentererCSS;
		});
	}
	renderer = VerticalCentererHTML;
	props = defineProps(this, {
		fullscreen: PROP_TYPE.BOOL
	}, {});
	loaded = true;
}

export { VerticalCentererHTML, VerticalCentererIDMap };