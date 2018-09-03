/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { SizingBlockIDMap } from './sizing-block-querymap';
import { config } from '../../../lib/webcomponent-util';
import { SizingBlockHTML } from './sizing-block.html';
import { SizingBlockCSS } from './sizing-block.css';

@config({
	is: 'sizing-block',
	css: SizingBlockCSS,
	html: SizingBlockHTML
})
export class SizingBlock extends ConfigurableWebComponent<SizingBlockIDMap> {
	
}