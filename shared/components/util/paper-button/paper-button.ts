/// <reference path="../../../types/elements.d.ts" />
import { config, isNewElement, defineProps, PROP_TYPE, changeOpacity } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from "../../../lib/webcomponents";
import { rippleEffect, RippleEffect } from '../../../mixins/ripple'
import { PaperButtonIDMap } from './paper-button-querymap';
import { PaperButtonHTML } from './paper-button.html';
import { bindToClass } from '../../../lib/decorators';
import { PaperButtonCSS } from './paper-button.css';
import { html } from 'lit-html';

@config({
	is: 'paper-button',
	css: PaperButtonCSS,
	html: PaperButtonHTML
})
@rippleEffect
export class PaperButton extends ConfigurableWebComponent<PaperButtonIDMap, {
	click: {
		args: [MouseEvent]
	}	
}> {
	props = defineProps(this, {
		reflect: {
			flat: PROP_TYPE.BOOL,
			color: PROP_TYPE.STRING,
			background: PROP_TYPE.STRING,
			rippleColor: PROP_TYPE.STRING,
			noRipple: PROP_TYPE.BOOL,
			small: PROP_TYPE.BOOL
		}
	});

	get customCSS() {
		if (this.props.color || this.props.background || this.props.rippleColor) {
			return html`<style>
				${this.props.color ? html`<style>
					#button {
						color: ${this.props.color};
					}
				</style>` : ''}
				${this.props.background ? html`<style>
					#button {
						background: ${this.props.background};
						background-color: ${this.props.background};
					}
				</style>` : ''}
				${this.props.rippleColor ? html`<style>
					#button .mdl-ripple {
						background: ${this.props.rippleColor};
						background-color: ${this.props.rippleColor};
					}

					:host #button:active {
						background-color: ${changeOpacity(this.props.rippleColor, 30)}
					}
				</style>` : ''}
			</style>`
		}
		return html`<style></style>`;
	}

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

			this.$.button.addEventListener('click', (e) => {
				this._fire('click', e);
			});
		}
	}
}