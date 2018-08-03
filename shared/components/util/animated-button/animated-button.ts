/// <reference path="../../../types/elements.d.ts" />
import { WebComponent, ComponentIs, genIsAccessor, WebComponentInterface } from '../../../lib/webcomponent-util';
import { rippleEffect, RippleEffect, bindToClass } from '../../../lib/decorators';
import { AnimatedButtonIDMap } from './animated-button-querymap';
import { AnimatedButtonHTML } from './animated-button.html';

@rippleEffect
export class AnimatedButton extends WebComponent<AnimatedButtonIDMap> implements WebComponentInterface {
	static is: ComponentIs = genIsAccessor('animated-button', () => {
		return AnimatedButton;
	});
	static get cssProvider() {
		return import('./animated-button.css').then((mod) => {
			return mod.AnimatedButtonCSS;
		});
	}
	renderer = AnimatedButtonHTML;
	loaded = true;

	private rippleElement: HTMLElement|null = null;
	get container() {
		return this.$.button;
	}

	@bindToClass
	blurHandler() {
		this.$.button.blur();
	}

	postRender() {
		if (this.$.button) {
			if (this.$.button.classList.contains('mdl-js-ripple-effect')) {
				var rippleContainer = document.createElement('span');
				rippleContainer.classList.add('mdl-button__ripple-container');
				this.rippleElement = document.createElement('span');
				this.rippleElement.classList.add('mdl-ripple');
				rippleContainer.appendChild(this.rippleElement);
				this.rippleElement.addEventListener('mouseup', this.blurHandler);
				this.$.button.appendChild(rippleContainer);
				(<any>this as RippleEffect).resetRipple();
				(<any>this as RippleEffect).applyRipple();
			}
			this.$.button.addEventListener('mouseup', this.blurHandler);
			this.$.button.addEventListener('mouseleave', this.blurHandler);
		}
	}
}