import { TemplateResult, html, render } from 'lit-html';
import { Theme } from '../../types/shared-types';
import { WebComponentDefiner } from './definer';
import { bindToClass } from '../decorators';
import { WebComponent } from './component';

type InferThis<T extends (this: any, ...args: any[]) => any> = 
	T extends (this: infer D, ...args: any[]) => any ? D : void;
type InferArgs<T extends (this: any, ...args: any[]) => any> = 
	T extends (this: any, ...args: infer R) => any ? R : void[];
type InferReturn<T extends (this: any, ...args: any[]) => any> = 
T extends (this: any, ...args: any[]) => infer R ? R : void;
function typeSafeCall<T extends (this: any, ...args: any[]) => any>(fn: T, 
	thisCtx: InferThis<T>, ...args: InferArgs<T>): InferReturn<T> {
		return fn.call(thisCtx, ...args);
	}

export const enum CHANGE_TYPE {
	PROP, THEME, NEVER, ALWAYS
}

type TemplateRenderFunction<T extends WebComponent<any, any>> = (this: T, 
	complexHTML: (strings: TemplateStringsArray, ...values: any[]) => TemplateResult,
	props: T['props'], theme: Theme, ) => TemplateResult;

const componentTemplateMap: WeakMap<WebComponent<any, any>, 
	WeakMap<TemplateFn<any>, TemplateResult|null>> = new WeakMap();
export type TemplateFnConfig = {
	changeOn: CHANGE_TYPE.NEVER;
	template: TemplateResult|null;
}|{
	changeOn: CHANGE_TYPE.ALWAYS|CHANGE_TYPE.THEME|CHANGE_TYPE.PROP;
	template: TemplateRenderFunction<any>
};
export class TemplateFn<T extends WebComponent<any, any> = any> {
	public changeOn!: CHANGE_TYPE;
	private _template!: (TemplateRenderFunction<T>)|TemplateResult|null;
	private _initialized: boolean = false;

	constructor(_fn: (TemplateRenderFunction<T>)|null,
		_changeType: CHANGE_TYPE.NEVER);
	constructor(_fn: (TemplateRenderFunction<T>),
		_changeType: CHANGE_TYPE.ALWAYS);
	constructor(_fn: (TemplateRenderFunction<T>),
		_changeType: CHANGE_TYPE.PROP);
	constructor(_fn: (TemplateRenderFunction<T>),
		_changeType: CHANGE_TYPE.THEME);
	constructor(private _fn: (TemplateRenderFunction<T>)|null,
		private _changeType: CHANGE_TYPE) { }

	private _doInitialRender(component: T) {
		if (this._changeType === CHANGE_TYPE.NEVER) {
			//Args don't matter here as they aren't used
			this.changeOn = CHANGE_TYPE.NEVER;
			if (this._fn) {
				this._template = typeSafeCall(this._fn as any,
					component) as any;
			} else {
				this._template = null;
			}
		} else {
			this.changeOn = this._changeType,
			this._template = this._fn as any
		}
	}

	public render(changeType: CHANGE_TYPE, component: T) {
		if (!this._initialized) {
			this._doInitialRender(component);
			this._initialized = true;
		}

		if (!componentTemplateMap.has(component)) {
			componentTemplateMap.set(component, new WeakMap());
		}
		const templateMap = componentTemplateMap.get(component)!;
		if (this.changeOn === CHANGE_TYPE.NEVER) {
			//Never change, return the only render
			const cached = templateMap.get(this);
			if (cached) {
				return cached;
			}
			const rendered = this._template === null ?
				html`` : this._template;
				templateMap.set(this, rendered as TemplateResult);
			return rendered;
		}
		if (this.changeOn === CHANGE_TYPE.ALWAYS || 
			changeType === CHANGE_TYPE.ALWAYS ||
			this.changeOn === changeType ||
			!templateMap.has(this)) {
				//Change, rerender
				const rendered = typeSafeCall(this._template as TemplateRenderFunction<T>, 
					component, component.complexHTML, component.props, component.getTheme());
				templateMap.set(this, rendered);
				return rendered;
			}
		
		//No change, return what was last rendered
		return templateMap.get(this)!;
	}
}

export abstract class WebComponentBase extends WebComponentDefiner {
	/**
	 * Whether the render method should be temporarily disabled (to prevent infinite loops)
	 */
	private __disableRender: boolean = false;

	/**
	 * Whether this is the first render
	 */
	private __firstRender: boolean = true;

	/**
	 * The render method that will render this component
	 */
	protected abstract renderer: TemplateFn = new TemplateFn(() => {
		throw new Error('No render method implemented');	
	}, CHANGE_TYPE.ALWAYS);

	/**
	 * The render method that will render this component's css
	 */
	protected abstract css: TemplateFn = new TemplateFn(null, CHANGE_TYPE.NEVER);

	/**
	 * A function signalign whether this component has custom CSS applied to it
	 */
	protected abstract __hasCustomCSS(): boolean;

	/**
	 * The render method that will render this component's css
	 */
	protected abstract customCSS(): TemplateFn;

	/**
	 * The root of this component's DOM
	 */
	protected root = this.attachShadow({
		mode: 'open'
	});
	
	/**
	 * The properties of this component
	 */
	props: any = {};

	private __doPreRenderLifecycle() {
		this.__disableRender = true;
		const retVal = this.preRender();
		this.__disableRender = false;
		return retVal;
	}

	private __doPostRenderLifecycle() {
		this.__internals.postRenderHooks.forEach(fn => fn());
		if (this.__firstRender) {
			this.__firstRender = false;
			this.firstRender();
		}
		this.postRender();
	}

	private __noHTML = html``;

	@bindToClass
	/**
	 * The method that starts the rendering cycle
	 */
	public renderToDOM(change: CHANGE_TYPE = CHANGE_TYPE.ALWAYS) {
		if (this.__disableRender) return;
		if (this.__doPreRenderLifecycle() === false) {
			return;
		}
		render(html`${this.css.render(change, this as any)}
		${this.__hasCustomCSS() ? 
			this.customCSS().render(change, this as any) : 
			this.__noHTML}
		${this.renderer.render(change, this as any)}`, 
			this.root);
		this.__doPostRenderLifecycle();
	}

	/**
	 * A method called before rendering (changing props won't trigger additional re-render)
	 */
	protected preRender(): false|any {}
	/**
	 * A method called after rendering
	 */
	protected postRender() {}
	/**
	 * A method called after the very first render
	 */
	protected firstRender() {}
}