import { defineProps, PROP_TYPE, genIs, WebComponent, ComponentIs } from '../../../lib/webcomponent-util';
import { VerticalCentererIDMap } from './vertical-centerer-querymap';
import { VerticalCentererHTML } from './vertical-centerer.html';

export class VerticalCenterer extends WebComponent<VerticalCentererIDMap> {
	static is: ComponentIs = genIs('vertical-centerer', VerticalCenterer);
	renderer = VerticalCentererHTML;
	props = defineProps(this, {
		fullscreen: PROP_TYPE.BOOL
	}, {});
	loaded = true;
}

declare global {
	type HTMLVerticalCentererElement = VerticalCenterer;
}
export { VerticalCentererHTML, VerticalCentererIDMap };
export { VerticalCentererCSS } from './vertical-centerer.css';