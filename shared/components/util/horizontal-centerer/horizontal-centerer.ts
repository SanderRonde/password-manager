/// <reference path="../../../types/elements.d.ts" />
import { WebComponent, genIs, ComponentIs, WebComponentInterface } from '../../../lib/webcomponent-util';
import { HorizontalCentererIDMap } from './horizontal-centerer-querymap';
import { HorizontalCentererHTML } from './horizontal-centerer.html';

export class HorizontalCenterer extends WebComponent<HorizontalCentererIDMap> implements WebComponentInterface {
	static is: ComponentIs = genIs('horizontal-centerer', HorizontalCenterer);
	static get cssProvider() {
		return import('./horizontal-centerer.css').then((mod) => {
			return mod.HorizontalCentererCSS;
		});
	}
	renderer = HorizontalCentererHTML;
	loaded = true;
}