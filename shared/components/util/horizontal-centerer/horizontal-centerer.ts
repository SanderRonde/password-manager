/// <reference path="../../../types/elements.d.ts" />
import { ConfigurableWebComponent } from "../../../lib/webcomponents";
import { HorizontalCentererIDMap } from './horizontal-centerer-querymap';
import { HorizontalCentererHTML } from './horizontal-centerer.html';
import { HorizontalCentererCSS } from './horizontal-centerer.css';
import { config } from '../../../lib/webcomponent-util';

@config({
	is: 'horizontal-centerer',
	css: HorizontalCentererCSS,
	html: HorizontalCentererHTML
})
export class HorizontalCenterer extends ConfigurableWebComponent<HorizontalCentererIDMap> { }