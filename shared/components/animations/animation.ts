import { ConfiguredComponent } from '../../lib/webcomponents/configurable';
import { TemplateFn, WebComponent } from '../../lib/webcomponents';

type AnimationFunction<T extends HTMLElement> = (htmlRoot: HTMLElement, element: T) => void;
export class AnimationDescriptor<T extends HTMLElement> {
	/**
	 * The animation ran when the element is mounted to the DOM and ready to be
	 *  manipulated. If your starting state is anything other than
	 *  the element's normal render, use "layoutMounted" instead in 
	 *  order to prevent a flash of the rendered element.
	 */
	mounted?(htmlRoot: HTMLElement, element: T): any;
	/**
	 * The animation ran when the element has been rendered for the first time.
	 *  This animation runs in the element's constructor and, as such,
	 *  will slow the element's creation. For this reason try to do
	 *  as little work as possible or shift some to other
	 *  hooks (mounted)
	 */
	layoutMounted?(htmlRoot: HTMLElement, element: T): any;
	/**
	 * This animation is ran when the element is being removed from the DOM.
	 *  Since this callback is called when the element is 
	 *  unmounted, chances are your animation won't be waited on
	 *  so try to make this animation as quick as possible
	 */
	unmounted?(htmlRoot: HTMLElement, element: T): any;
}

type ExtendTarget = {new(...args: Array<any>): WebComponent<any, any>} & typeof WebComponent;

export function animation<T extends HTMLElement = HTMLElement>(
	animationDescriptor: typeof AnimationDescriptor) {
		return (target: any): any => {
			return class Animated extends (target as ExtendTarget) {
				public css!: TemplateFn;
				public __hasCustomCSS!: () => boolean;
				public customCSS!: () => TemplateFn;
				public html!: TemplateFn;
				public get self(): typeof ConfiguredComponent { return {} as any}

				private __htmlRoot: HTMLElement|null = null;
				private __animation: AnimationDescriptor<T> = new animationDescriptor<T>();

				constructor() {
					super();

				}

				private get _htmlRoot() {
					if (this.__htmlRoot) {
						return this.__htmlRoot;
					}
					return (this.__htmlRoot = this.root.querySelector('[data-type="html"]'));
				}

				private _runAnimation(animation: AnimationFunction<T>) {
					if (!this._htmlRoot) return;
					animation(this._htmlRoot, this as any);
				}

				private _runAnimations(animation: AnimationFunction<T>|void) {
					animation && this._runAnimation(animation);
				}

				layoutMounted() {
					this._runAnimations(this.__animation.layoutMounted);
					super.layoutMounted();
				}

				mounted() {
					this._runAnimations(this.__animation.mounted);
					super.mounted();
				}

				unmounted() {
					this._runAnimations(this.__animation.unmounted);
					super.unmounted();
				}
			}
		}
	}

export function joinAnimations<T extends HTMLElement = HTMLElement>(...animations: AnimationDescriptor<T>[]) {
	return animations.reduce((prev, current) => {
		return class JoinedAnimations extends AnimationDescriptor<T> {
			mounted(root: HTMLElement, element: T) {
				prev.mounted && prev.mounted(root, element);
				current.mounted && current.mounted(root, element);
			}

			layoutMounted(root: HTMLElement, element: T) {
				prev.layoutMounted && prev.layoutMounted(root, element);
				current.layoutMounted && current.layoutMounted(root, element);
			}

			unmounted(root: HTMLElement, element: T) {
				prev.unmounted && prev.unmounted(root, element);
				current.unmounted && current.unmounted(root, element);
			}
		}
	}, {});
}