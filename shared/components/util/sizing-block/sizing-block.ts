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

	private _cachedAnimations: Map<number, Map<number, {
		animation: Animation;
		state: 'end'|'start';
	}>> = new Map();

	private _getCachedAnimation(from: number, to: number) {
		const toMap = this._cachedAnimations.get(from);
		if (!toMap) return null;

		const animation = toMap.get(to);
		if (!animation) return null;

		return () => {
			if (animation.state === 'start') {
				animation.animation.play();
			} else {
				animation.animation.reverse();
			}
			animation.state = animation.state === 'start' ?
				'end' : 'start';
			return wait(SizingBlock.ANIMATE_DURATION);
		}
	}

	private _setCachedAnimation(from: number, to: number, animation: Animation) {
		if (!this._cachedAnimations.has(from)) {
			this._cachedAnimations.set(from, new Map());
		}
		
		const fromMap = this._cachedAnimations.get(from)!;
		if (!fromMap.has(to)) {
			fromMap.set(to, {
				animation,
				state: 'end'
			});
		}
	}

	private _animate(target: HTMLElement, keyframes: Partial<{
		[key in Extract<keyof CSSStyleDeclaration, string>]: string
	}>[], options?: number|KeyframeAnimationOptions) {
		if (this._supportsAnimate) {
			const animation = target.animate(keyframes as any, options);
			return {
				animation: animation,
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
		if (this._supportsAnimate) {
			const cached = this._getCachedAnimation(from, to);
			if (cached) {
				await cached();
				return;
			}
		}

		const { animation, done } = this._animate(this.$.sizer, [{
			height: px(from)
		}, {
			height: px(to)
		}], {
			duration: SizingBlock.ANIMATE_DURATION,
			easing: 'ease-in-out',
			fill: 'both'
		});
		await done;
		if (animation) {
			this._setCachedAnimation(from, to, animation);
		}
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