/// <reference path="../../../types/elements.d.ts" />
import { ConfigurableWebComponent, config } from '../../../lib/webcomponent-util';
import { HorizontalCentererIDMap } from './horizontal-centerer-querymap';
import { HorizontalCentererHTML } from './horizontal-centerer.html';
import { HorizontalCentererCSS } from './horizontal-centerer.css';

@config({
	is: 'horizontal-centerer',
	css: HorizontalCentererCSS,
	renderer: HorizontalCentererHTML
})
export class HorizontalCenterer extends ConfigurableWebComponent<HorizontalCentererIDMap> { }