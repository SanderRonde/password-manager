import { defineProps, PROP_TYPE, genIs, WebComponentBase } from '../../../lib/webcomponent-util';
import { VerticalCentererHTML } from './vertical-centerer.html';

export class VerticalCenterer extends WebComponentBase {
	static is = genIs('vertical-centerer', VerticalCenterer);
	renderer = VerticalCentererHTML;
	loaded = true;

	props = defineProps(this, {
		fullscreen: PROP_TYPE.BOOL
	}, {});
}

export { VerticalCentererHTML };
export { VerticalCentererCSS } from './vertical-centerer.css';