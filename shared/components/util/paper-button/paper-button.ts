/// <reference path="../../../types/elements.d.ts" />
import { ConfigurableWebComponent, config, isNewElement } from '../../../lib/webcomponent-util';
import { rippleEffect, RippleEffect } from '../../../mixins/ripple'
import { PaperButtonIDMap } from './paper-button-querymap';
import { PaperButtonHTML } from './paper-button.html';
import { PaperButtonCSS } from './paper-button.css';
import { bindToClass } from '../../../lib/decorators';

@config({
	is: 'paper-button',
	css: PaperButtonCSS,
	html: PaperButtonHTML
})
@rippleEffect
export class AnimatedButton extends ConfigurableWebComponent<PaperButtonIDMap> {
	private rippleElement: HTMLElement|null = null;
	get container() {
		return this.$.button;
	}

	@bindToClass
	blurHandler() {
		this.$.button.blur();
	}

	disable() {
		this.$.button.setAttribute('disabled', '');
	}

	enable() {
		this.$.button.removeAttribute('disabled');
	}

	postRender() {
		if (this.$.button && isNewElement(this.$.button)) {
			if (this.$.button.classList.contains('mdl-js-ripple-effect')) {
				var rippleContainer = document.createElement('span');
				rippleContainer.classList.add('mdl-button__ripple-container');
				this.rippleElement = document.createElement('span');
				this.rippleElement.classList.add('mdl-ripple');
				rippleContainer.appendChild(this.rippleElement);
				this.rippleElement.addEventListener('mouseup', this.blurHandler);
				this.$.button.appendChild(rippleContainer);

				(<any>this as RippleEffect).applyRipple();
			}
			this.$.button.addEventListener('mouseup', this.blurHandler);
			this.$.button.addEventListener('mouseleave', this.blurHandler);
		}
	}
}