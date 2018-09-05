/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent, TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { config, wait } from '../../../lib/webcomponent-util';
import { SizingBlockIDMap } from './sizing-block-querymap';
import { SizingBlockHTML } from './sizing-block.html';

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
			height: px(to)
		}], {
			duration: SizingBlock.ANIMATE_DURATION,
			easing: 'ease-in-out',
			fill: 'both'
		});
		await done;
	}

	async setSize(height: number) {
		if (height === this._currentHeight) {
			return;
		}

		await this._animateHeight(this._currentHeight, height);
		this._currentHeight = height;
	}

	getSize() {
		return this._currentHeight;
	}

	mounted() {
		this._currentHeight = this.$.sizer.getBoundingClientRect().height;
		this.$.sizer.style.height = px(this._currentHeight);
	}
}