/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent, TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { config, wait, defineProps, PROP_TYPE } from '../../../lib/webcomponent-util';
import { SizingBlockIDMap } from './sizing-block-querymap';
import { SizingBlockHTML } from './sizing-block.html';
import { html } from 'lit-html';

function px(num: number): string {
	return `${num}px`;
}

@config({
	is: 'sizing-block',
	css: new TemplateFn<SizingBlock>(null, CHANGE_TYPE.NEVER),
	html: SizingBlockHTML
})
export class SizingBlock extends ConfigurableWebComponent<SizingBlockIDMap> {
	private _currentHeight: number = 0;
	private _supportsAnimate = !!HTMLElement.prototype.animate;
	private static readonly ANIMATE_DURATION = 300;

	props = defineProps(this, {
		reflect: {
			maxHeight: {
				type: PROP_TYPE.STRING
			}
		}
	});

	public getMaxHeightCSS() {
		if (!this.props.maxHeight) {
			return '';
		}
		return html`<style>
			#sizer {
				overflow-y: auto;
				max-height: ${this.props.maxHeight};
			}
		</style>`;
	}

	private _animate(target: HTMLElement, keyframes: Partial<{
		[key in Extract<keyof CSSStyleDeclaration, string>]: string
	}>[], options?: number|KeyframeAnimationOptions) {
		if (this._supportsAnimate) {
			target.animate(keyframes as any, options);
			return {
				done: wait(SizingBlock.ANIMATE_DURATION)
			}
		} else {
			const finalFrame = keyframes.pop()!;
			for (const key in finalFrame) {
				target.style[key as any] = (finalFrame as any)[key as any];
			}
			return {
				done: Promise.resolve()
			}
		}
	}

	private async _animateHeight(from: number, to: number) {
		const { done } = this._animate(this.$.sizer, [{
			height: px(from)
		}, {
			height: px(Math.min(this._maxHeight, to))
		}], {
			duration: SizingBlock.ANIMATE_DURATION,
			easing: 'ease-in-out',
			fill: 'both'
		});
		await done;
	}

	private static _makeNum(str: string|number): number {
		if (typeof str === 'number') {
			return str;
		}
		const splitStr = str.split('.');
		let num = ~~str;
		if (splitStr.length > 1) {
			if (splitStr[1].length > 1) {
				num = num + (~~splitStr[1] / 100);
			} else {
				num = num + (~~splitStr[1] / 10);
			}
		}
		return num;
	}

	private static _calc(terms: (string|number)[]): number {
		let index;
		if ((index = terms.indexOf('*')) > -1) {
			return SizingBlock._calc(terms.slice(0, index - 1).concat([
				SizingBlock._makeNum(terms[index - 1]) * SizingBlock._makeNum(terms[index + 1])
			]).concat(terms.slice(index + 2)));
		} else if ((index = terms.indexOf('/')) > -1) {
			return SizingBlock._calc(terms.slice(0, index - 1).concat([
				SizingBlock._makeNum(terms[index - 1]) / SizingBlock._makeNum(terms[index + 1])
			]).concat(terms.slice(index + 2)));
		} else if (terms.indexOf('-') > -1 || terms.indexOf('+') > -1) {
			terms.forEach((term, index) => {
				if (term === '-') {
					terms[index + 1] = -1 * SizingBlock._makeNum(terms[index + 1]);
					terms[index] = '+';
				}
			});
			if (terms.length === 0) {
				return 0;
			} else if (terms.length === 1) {
				return SizingBlock._makeNum(terms[0]);
			} else {
				return terms.reduce((prevValue, currentValue) => {
					return SizingBlock._makeNum(prevValue) + SizingBlock._makeNum(currentValue);
				}) as number;
			}
		} else {
			return SizingBlock._makeNum(terms[0]);
		}
	}

	private static _splitTerms(str: string): string[] {
		let index = 0;
		if ((index = str.indexOf('+')) > -1) {
			return ([] as string[])
				.concat(SizingBlock._splitTerms(str.slice(0, index)))
				.concat(['+'])
				.concat(SizingBlock._splitTerms(str.slice(index + 1)));
		} else if ((index = str.indexOf('-')) > -1) {
			return ([] as string[])
				.concat(SizingBlock._splitTerms(str.slice(0, index)))
				.concat(['-'])
				.concat(SizingBlock._splitTerms(str.slice(index + 1)));
		} else if ((index = str.indexOf('*')) > -1) {
			return ([] as string[])
				.concat(SizingBlock._splitTerms(str.slice(0, index)))
				.concat(['*'])
				.concat(SizingBlock._splitTerms(str.slice(index + 1)));
		} else if ((index = str.indexOf('/')) > -1) {
			return ([] as string[])
				.concat(SizingBlock._splitTerms(str.slice(0, index)))
				.concat(['/'])
				.concat(SizingBlock._splitTerms(str.slice(index + 1)));
		} else {
			return [str];
		}
	}

	private static _calculate(str: string): number {
		const parenthesesRegex = /\((.*)\)/;
		let match = null;
		if ((match = parenthesesRegex.exec(str))) {
			return SizingBlock._calculate(str.replace(match[0], 
				SizingBlock._calculate(match[1]) + ''));
		} else {
			return SizingBlock._calc(SizingBlock._splitTerms(str).map((term) => {
				return term.trim();
			}));
		}
	}

	private _calcMaxHeight(str: string): number {
		const parenthesesRegex = /\((.*)\)/;
		let match = null;
		if ((match = parenthesesRegex.exec(str))) {
			return this._calcMaxHeight(
				str.replace(match[0], SizingBlock._calculate(match[1]) + ''));
		} else {
			return SizingBlock._calc(SizingBlock._splitTerms(str).map((term) => {
				return term.trim();
			}));
		}
	}

	private __maxHeightUsed: string|undefined = undefined;
	private __maxHeightNumber: number = 0;
	private get _maxHeight() {
		if (this.props.maxHeight === undefined) {
			return Infinity;
		}
		//Convert max size to numbers
		if (this.__maxHeightUsed === this.props.maxHeight) {
			return this.__maxHeightNumber;
		}
		this.__maxHeightUsed = this.props.maxHeight;
		return (this.__maxHeightNumber = this._calcMaxHeight(this.props.maxHeight
			.replace('vw', ' * ' + window.innerWidth / 100)
			.replace('vh', ' * ' + window.innerHeight / 100)
			.replace('em', ' * 16')
			.replace('px', '')));
	}

	async setSize(height: number) {
		if (height === this._currentHeight || this._currentHeight > this._maxHeight &&
			height > this._maxHeight) {
				return;
			}
		const prevHeight = this._currentHeight;

		await this._animateHeight(this._currentHeight, height);
		if (this._currentHeight === prevHeight) {
			this._currentHeight = height;
		}
	}

	getSize() {
		return this._currentHeight;
	}

	async mounted() {
		let size = this.$.sizer.getBoundingClientRect().height;
		if (size === 0) {
			await wait(1000);
			size = this.$.sizer.getBoundingClientRect().height;
		}
		this._currentHeight = size;
		this.$.sizer.style.height = px(size);
	}
}