/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent, config, Props, ComplexType, PROP_TYPE } from '../../../lib/webcomponents';
import { HorizontalCenterer } from '../horizontal-centerer/horizontal-centerer';
import { VerticalCenterer } from '../vertical-centerer/vertical-centerer';
import { PaperDialogIDMap } from './paper-dialog-querymap';
import { PaperDialogHTML } from './paper-dialog.html';
import { PaperDialogCSS } from './paper-dialog.css';
import { MDCard } from '../md-card/md-card';

const enum DISPLAY_MODE {
	//Fill the page with just the content
	FILL_CONTENT,
	//Cover a big part of the page regardless
	// of content size
	COVER
}

const BACKDROP_OPACITY = 0.3;
const ANIMATION_DURATION = 400;

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
				value: DISPLAY_MODE.FILL_CONTENT
			},
			title: PROP_TYPE.STRING,
			visible: {
				type: PROP_TYPE.BOOL,
				value: false
			}
		}
	});

	show() {
		PaperDialog.showBackdrop();
	}

	hide() {
		PaperDialog.hideBackdrop();
	}

	private static _backdrop: HTMLElement|null = null;

	private static _createBackdrop() {
		const el = document.createElement('div');
		el.style.width = '100vw';
		el.style.height = '100vh';
		el.style.backgroundColor = 'black';
		el.style.opacity = '0';
		el.style.zIndex = 5000 + '';

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
				duration: ANIMATION_DURATION
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
				duration: ANIMATION_DURATION
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