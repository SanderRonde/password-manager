/// <reference path="../../../types/elements.d.ts" />

import { FloatingActionButtonIDMap } from './floating-action-button-querymap';
import { FloatingActionButtonHTML } from './floating-action-button.html';
import { FloatingActionButtonCSS } from './floating-action-button.css';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { config, Props } from '../../../lib/webcomponent-util';

@config({
	is: 'floating-action-button',
	css: FloatingActionButtonCSS,
	html: FloatingActionButtonHTML
})
export class FloatingActionButton extends ConfigurableWebComponent<FloatingActionButtonIDMap> {
	props = Props.define(this, {

	});
}