/// <reference path="../../../types/elements.d.ts" />
import { createCancellableTimeout, awaitMounted } from '../../../lib/webcomponents/template-util';
import { ConfigurableWebComponent, config, Props, PROP_TYPE } from '../../../lib/webcomponents';
import { isNewElement, wait } from '../../../lib/webcomponent-util';
import { PaperButton } from '../paper-button/paper-button';
import { PaperToastIDMap } from './paper-toast-querymap';
import { rippleEffect } from '../../../mixins/ripple';
import { PaperToastHTML } from './paper-toast.html';
import { PaperToastCSS } from './paper-toast.css';

interface ToastButton {
	content: string;
	listener: (e: MouseEvent, toast: PaperToast) => void;
}

const TOAST_NAME = 'paper-toast';
@config({
	is: TOAST_NAME,
	css: PaperToastCSS,
	html: PaperToastHTML,
	dependencies: [
		PaperButton
	]
})
@rippleEffect
export class PaperToast extends ConfigurableWebComponent<PaperToastIDMap, {
	buttonClick: {
		args: [number, MouseEvent]
	};
	hide: {
		args: []
	}
}> {
	props = Props.define(this, {
		reflect: {
			content: {
				type: PROP_TYPE.STRING,
				defaultValue: ''
			},
			button1: PROP_TYPE.STRING,
			button2: PROP_TYPE.STRING,
			duration: {
				type: PROP_TYPE.NUMBER,
				defaultValue: 5000,
				coerce: true
			}
		}	
	});

	private static _showListeners: ((type: 'show'|'hide') => void)[] = [];
	static listen(listener: (type: 'show'|'hide') => void) {
		this._showListeners.push(listener);
	}

	show() {
		PaperToast._showListeners.forEach(listener => listener('show'));

		this.classList.add('show');
		if (this.props.duration === Infinity) {
			return;
		}
		createCancellableTimeout(this, 'show', () => {
			this.hide();
		}, this.props.duration);
	}

	async hide() {
		PaperToast._showListeners.forEach(listener => listener('hide'));

		this.classList.remove('show');
		this.fire('hide');
		await wait(300);
		this.remove();
	}

	async postRender() {
		const buttons = this.$.toastButtons;
		if (buttons) {
			const [ button1, button2 ] = <PaperButton[]><any>buttons.children;
			if (this.props.button1 && isNewElement(button1)) {
				await awaitMounted(button1);
				button1.listen('click', (e) => {
					this.fire('buttonClick', 0, e);
				});
			}
			if (this.props.button2 && isNewElement(button2)) {
				await awaitMounted(button2);
				button2.listen('click', (e) => {
					this.fire('buttonClick', 1, e);
				});
			}
		}
	}

	private static _queue: PaperToast[] = [];
	private static _createElement({
		content, buttons = [], duration = 5000
	}: {
		content: string;
		buttons?: ToastButton[];
		duration?: number;
	}) {
		const el = document.createElement(TOAST_NAME) as PaperToast;
		el.props.content = content;
		if (buttons[0]) {
			el.props.button1 = buttons[0].content;
		}
		if (buttons[1]) {
			el.props.button1 = buttons[1].content;
		}
		el.listen('buttonClick', (index, e) => {
			buttons[index].listener(e, el);
		});
		el.props.duration = duration;
		return el;
	}
	
	private static _queueElement(el: PaperToast) {
		if (!el) {
			return;
		}

		setTimeout(() => {
			el.show();
			el.listen('hide', () => {
				this._queue.shift();
				this._queueElement(this._queue[0]);
			});
		}, 0);
	}

	static BUTTONS = {
		HIDE: {
			content: 'HIDE',
			listener(_e, toast) {
				toast.hide();
			}
		} as ToastButton
	}
	static DURATION = {
		SHORT: 2500,
		NORMAL: 5000,
		LONG: 10000,
		FOREVER: 1000 * 60 * 60 * 24
	}

	static createHidable(content: string, duration: number = this.DURATION.SHORT) {
		return this.create({
			content,
			duration,
			buttons: [this.BUTTONS.HIDE]
		});
	}

	static create(config: {
		content: string;
		buttons?: ToastButton[];
		duration?: number;
	}): PaperToast {
		const el = this._createElement(config);
		document.body.appendChild(el);

		this._queue.push(el);
		if (this._queue.length === 1) {
			this._queueElement(el);
		}
		return el;
	}

	static hideAll() {
		if (!this._queue.length) return;

		const first = this._queue[0];
		while (this._queue.length) { this._queue.pop()!.hide(); }

		first.hide();
	}
}