/// <reference path="../../../types/elements.d.ts" />
import { WebComponent, genIs, ComponentIs } from '../../../lib/webcomponent-util';
import { HorizontalCentererIDMap } from './horizontal-centerer-querymap';
import { HorizontalCentererHTML } from './horizontal-centerer.html';

export class HorizontalCenterer extends WebComponent<HorizontalCentererIDMap> {
	static is: ComponentIs = genIs('horizontal-centerer', HorizontalCenterer);
	renderer = HorizontalCentererHTML;
	loaded = true;
}

export { HorizontalCentererHTML, HorizontalCentererIDMap }
export { HorizontalCentererCSS } from './horizontal-centerer.css'