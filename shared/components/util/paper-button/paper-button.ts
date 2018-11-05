/// <reference path="../../../types/elements.d.ts" />
import { ConfigurableWebComponent, config, Props, PROP_TYPE } from "../../../lib/webcomponents";
import { changeOpacity } from '../../../lib/webcomponents/template-util';
import { rippleEffect, RippleEffect } from '../../../mixins/ripple'
import { isNewElement } from '../../../lib/webcomponent-util';
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
	props = Props.define(this, {
		reflect: {
			flat: PROP_TYPE.BOOL,
			color: PROP_TYPE.STRING,
			background: PROP_TYPE.STRING,
			rippleColor: PROP_TYPE.STRING,
			noRipple: PROP_TYPE.BOOL,
			small: PROP_TYPE.BOOL,
			ariaLabel: {
				type: PROP_TYPE.STRING,
				coerce: true
			},
			border: PROP_TYPE.BOOL,
			borderColor: PROP_TYPE.STRING,
			content: PROP_TYPE.STRING
		}
	});

	get __customCSS() {
		if (this.props.color || this.props.background || this.props.rippleColor || this.props.border) {
			return html`<style>
				${this.props.color ? this.getColorCustomCSS() : ''}
				${this.props.background ? this.getBackgroundCustomCSS() : ''}
				${this.props.rippleColor ? this.getRippleColorCustomCSS() : ''}
				${this.props.borderColor || this.props.border ? this.getBorderColorCustomCSS() : ''}
			</style>`
		}
		return html`<style></style>`;
	}

	private rippleElement: HTMLElement|null = null;
	private getBorderColorCustomCSS(): any {
		return html`
			<style>
				#button {
					border: 2px solid ${this.props.borderColor || 
						this.props.color || this.props.rippleColor ||
						this.props.background || this.getTheme().primary.main};
				}
			</style>
		`;
	}
	private getRippleColorCustomCSS(): any {
		return html`<style>
			#button .mdl-ripple {
				background: ${this.props.rippleColor};
				background-color: ${this.props.rippleColor};
			}

			:host #button:active {
				background-color: ${changeOpacity(this.props.rippleColor, 30)}
			}
		</style>`;
	}

	private getBackgroundCustomCSS(): any {
		return html`<style>
			#button {
				background: ${this.props.background};
				background-color: ${this.props.background};
			}
		</style>`;
	}

	private getColorCustomCSS(): any {
		return html`<style>
			#button {
				fill: ${this.props.color};
				color: ${this.props.color};
			}
		</style>`;
	}

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

	@bindToClass
	public buttonClick(e: MouseEvent) {
		this.fire('click', e);
	}

	postRender() {
		if (this.$.button && isNewElement(this.$.button)) {
			if (this.$.button.classList.contains('mdl-js-ripple-effect')) {
				var rippleContainer = document.createElement('span');
				rippleContainer.classList.add('mdl-button__ripple-container');
				if (this.rippleElement) {
					this.rippleElement.removeEventListener('mouseup',
						this.blurHandler);
					this.rippleElement.remove();
				}
				this.rippleElement = document.createElement('span');
				this.rippleElement.classList.add('mdl-ripple');
				rippleContainer.appendChild(this.rippleElement);
				this.rippleElement.addEventListener('mouseup', this.blurHandler);
				this.$.button.appendChild(rippleContainer);

				(<any>this as RippleEffect).applyRipple();
			}
		}
	}
}