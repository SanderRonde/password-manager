/// <reference path="../../../types/elements.d.ts" />
import { ConfigurableWebComponent, config, Props, PROP_TYPE, bindToClass, isNewElement, wait } from "wclib";
import { AnimatedButtonCSS, FADE_IN_OUT_TIME, COLOR_FADE_TIME } from './animated-button.css';
import { AnimatedButtonIDMap, AnimatedButtonClassMap } from './animated-button-querymap';
import { LoadingSpinner } from '../loading-spinner/loading-spinner';
import { rippleEffect, RippleEffect } from '../../../mixins/ripple'
import { AnimatedButtonHTML } from './animated-button.html';

@config({
	is: 'animated-button',
	css: AnimatedButtonCSS,
	html: AnimatedButtonHTML,
	dependencies: [ LoadingSpinner ]
})
@rippleEffect
export class AnimatedButton extends ConfigurableWebComponent<{
	IDS: AnimatedButtonIDMap;
	CLASSES: AnimatedButtonClassMap;
}, {
	click: {
		args: [MouseEvent]
	}
}> {
	props = Props.define(this, {
		reflect: {
			content: PROP_TYPE.STRING,
			ariaLabel: {
				type: PROP_TYPE.STRING,
				coerce: true
			}
		}
	});
	private _state: 'success'|'failure'|'loading'|'regular' = 'regular';

	private rippleElement: HTMLElement|null = null;
	get container() {
		return this.$.button;
	}

	@bindToClass
	blurHandler() {
		this.$.button.blur();
	}

	private _fadeOutCurrentContent() {
		this.$.content.classList.add('fadeOut');
		return wait(FADE_IN_OUT_TIME);
	}

	private _fadeInCurrentContent() {
		this.$.content.classList.remove('fadeOut');
		return wait(FADE_IN_OUT_TIME);
	}

	private _hideAll() {
		this.$.regularContent.classList.remove('visible');
		this.$.successContent.classList.remove('visible');
		this.$.failureContent.classList.remove('visible');
		this.$.loadingContent.classList.remove('visible');
	}

	private _showIcon(state: 'success'|'failure'|'loading'|'regular') {
		switch (state) {
			case 'success':
				this.$.successContent.classList.add('visible');
				break;
			case 'failure':
				this.$.failureContent.classList.add('visible');
				break;
			case 'loading':
				this.$.loadingContent.classList.add('visible');
				break;
			case 'regular':
				this.$.regularContent.classList.add('visible');
				break;
		}
	}

	private _clearColors() {
		this.$.button.classList.remove('success');
		this.$.button.classList.remove('failure');
	}

	private async _setContent(state: 'success'|'failure'|'loading'|'regular') {
		const bcr = this.$.button.getBoundingClientRect();
			
		if (bcr.width !== 0 && bcr.height !== 0) {
			this.$.button.style.width = bcr.width + 'px';
			this.$.button.style.height = bcr.height + 'px';
		}

		await this._fadeOutCurrentContent();
		this._hideAll();
		this._showIcon(state);
		await this._fadeInCurrentContent();
	}

	private async _setColor(state: 'success'|'failure'|'loading'|'regular') {
		this._clearColors();

		switch (state) {
			case 'success':
			case 'failure':
				this.$.button.classList.add(state);
				break;
		}
		await wait(COLOR_FADE_TIME)
	}

	getState() {
		return this._state;
	}

	async setState(state: 'success'|'failure'|'loading'|'regular') {
		const STATES = ['success', 'failure', 'loading', 'regular'];
		if (STATES.indexOf(state) === -1) throw new Error(`State "${state}" is not a valid state`);

		this._state = state;

		//These should run concurrently
		return Promise.all([
			this._setContent(state), 
			this._setColor(state)
		]);
	}

	disable() {
		this.$.button.setAttribute('disabled', '');
	}

	enable() {
		this.$.button.removeAttribute('disabled');
	}

	@bindToClass
	public onButtonClick(e: MouseEvent) {
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