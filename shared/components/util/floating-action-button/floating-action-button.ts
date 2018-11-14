/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent, config, Props, PROP_TYPE } from '../../../lib/webcomponents';
import { HorizontalCenterer } from '../horizontal-centerer/horizontal-centerer';
import { FloatingActionButtonIDMap } from './floating-action-button-querymap';
import { VerticalCenterer } from '../vertical-centerer/vertical-centerer';
import { FloatingActionButtonHTML } from './floating-action-button.html';
import { FloatingActionButtonCSS } from './floating-action-button.css';
import { rippleEffect, RippleEffect } from '../../../mixins/ripple';
import { isNewElement } from '../../../lib/listeners';
import { bindToClass } from '../../../lib/decorators';

@config({
	is: 'floating-action-button',
	css: FloatingActionButtonCSS,
	html: FloatingActionButtonHTML,
	dependencies: [HorizontalCenterer, VerticalCenterer]
})
@rippleEffect
export class FloatingActionButton extends ConfigurableWebComponent<FloatingActionButtonIDMap, {
	click: {
		args: [MouseEvent]
	}
}> {
	props = Props.define(this, {
		reflect: {
			color: PROP_TYPE.STRING,
			backgroundColor: PROP_TYPE.STRING,
			noFloat: {
				type: PROP_TYPE.BOOL,
				value: false
			},
			hide: {
				type: PROP_TYPE.BOOL,
				value: false
			}
		}
	});

	fadeOut() {
		this.props.hide = true;
	}

	fadeIn() {
		this.props.hide = false;
	}

	@bindToClass
	public onClick(e: MouseEvent) {
		this.fire('click', e);
	}

	private rippleElement: HTMLElement|null = null;
	protected get container() {
		return this.$.rippleContainer;
	}
	postRender() {
		if (isNewElement(this.$.rippleContainer)) {
			(() => {
				var rippleContainer = document.createElement('span');
				rippleContainer.classList.add('mdl-button__ripple-container');
				if (this.rippleElement) {
					this.rippleElement.remove();
				}
				this.rippleElement = document.createElement('span');
				this.rippleElement.classList.add('mdl-ripple');
				rippleContainer.appendChild(this.rippleElement);
				this.$.rippleContainer.appendChild(rippleContainer);

				(<any>this as RippleEffect).applyRipple();
			})();
		}
	}
}