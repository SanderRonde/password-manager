/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent, config, Props, ComplexType, PROP_TYPE } from '../../../lib/webcomponents';
import { HorizontalCenterer } from '../horizontal-centerer/horizontal-centerer';
import { VerticalCenterer } from '../vertical-centerer/vertical-centerer';
import { PaperDialogIDMap } from './paper-dialog-querymap';
import { PaperDialogHTML } from './paper-dialog.html';
import { wait } from '../../../lib/webcomponent-util';
import { PaperDialogCSS } from './paper-dialog.css';
import { MDCard } from '../md-card/md-card';

export const enum DISPLAY_MODE {
	//Cover only the content
	COVER,
	//Fullscreen on the page
	FULLSCREEN
}

const BACKDROP_OPACITY = 0.3;
export const ANIMATION_DURATION = 400;

@config({
	is: 'paper-dialog',
	css: PaperDialogCSS,
	html: PaperDialogHTML,
	dependencies: [
		HorizontalCenterer,
		VerticalCenterer,
		MDCard
	]
})
export class PaperDialog extends ConfigurableWebComponent<PaperDialogIDMap> {
	props = Props.define(this, {
		reflect: {
			mode: {
				type: ComplexType<DISPLAY_MODE>(),
				value: DISPLAY_MODE.COVER
			},
			title: PROP_TYPE.STRING,
			visible: {
				type: PROP_TYPE.BOOL,
				value: false
			}
		}
	});

	async show() {
		PaperDialog.showBackdrop();
		this.$.dialogSemantic.setAttribute('open', 'open');
		await wait(0);
		this.$.dialogSemantic.classList.add('animate');
		wait(ANIMATION_DURATION);
	}

	async hide() {
		this.$.dialogSemantic.classList.remove('animate');
		await wait(ANIMATION_DURATION);
		PaperDialog.hideBackdrop();
		this.$.dialogSemantic.removeAttribute('open');
	}

	private static _backdrop: HTMLElement|null = null;

	private static _createBackdrop() {
		const el = document.createElement('div');
		el.style.width = '100vw';
		el.style.height = '100vh';
		el.style.backgroundColor = 'black';
		el.style.opacity = '0';
		el.style.zIndex = '5000';
		el.style.top = '0';
		el.style.position = 'fixed';

		el.style.display = 'none';
		el.style.pointerEvents = 'none';
		document.body.appendChild(el);
		return el;
	}

	private static _animation: Animation|null = null;
	static showBackdrop() {
		return new Promise((resolve) => {
			document.documentElement.style.overflow = 'hidden';

			const el = this.backdrop;
			el.style.display = 'block';
			el.style.pointerEvents = 'all';

			this._animation && this._animation.cancel();
			this._animation = el.animate([{
				opacity: 0
			}, {
				opacity: BACKDROP_OPACITY
			}], {
				duration: ANIMATION_DURATION,
				fill: 'forwards'
			});
			this._animation.onfinish = () => {
				this._animation = null;
				resolve();
			};
		});
	}

	static hideBackdrop() {
		return new Promise((resolve) => {
			const el = this.backdrop;

			el.style.pointerEvents = 'none';
			document.documentElement.style.overflow = 'auto';
			this._animation && this._animation.cancel();
			this._animation = el.animate([{
				opacity: BACKDROP_OPACITY
			}, {
				opacity: 0
			}], {
				duration: ANIMATION_DURATION,
				fill: 'forwards'
			});
			this._animation.onfinish = () => {
				el.style.display = 'none';

				this._animation = null;
				resolve();
			};
		});
	}

	static get backdrop() {
		if (this._backdrop) {
			return this._backdrop;
		}
		return (this._backdrop = this._createBackdrop());
	}
}