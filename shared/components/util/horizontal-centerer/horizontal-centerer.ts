import { WebComponent, genIs, ComponentIs } from '../../../lib/webcomponent-util';
import { HorizontalCentererHTML } from './horizontal-centerer.html';

export class HorizontalCenterer extends WebComponent {
	static is: ComponentIs = genIs('horizontal-centerer', HorizontalCenterer);
	renderer = HorizontalCentererHTML;
	loaded = true;
}

export { HorizontalCentererHTML }
export { HorizontalCentererCSS } from './horizontal-centerer.css'