import { repeat, makeArray } from '../webcomponent-util';
import { TemplateResult, html, render } from 'lit-html';
import { ConfiguredComponent } from './configurable';
import { WebComponentDefiner } from './definer';
import { Theme } from './webcomponent-types';
import { WebComponent } from './component';
import { WebComponentThemeManger } from './theme-manager';

export function bindToClass<T extends Function>(_target: object, propertyKey: string, 
	descriptor: TypedPropertyDescriptor<T>): TypedPropertyDescriptor<T> | void {
		if(!descriptor || (typeof descriptor.value !== 'function')) {
			throw new TypeError(`Only methods can be decorated with @bind. <${propertyKey}> is not a method!`);
		}
		
		return {
			configurable: true,
			get(this: T): T {
				const bound: T = descriptor.value!.bind(this);
				Object.defineProperty(this, propertyKey, {
					value: bound,
					configurable: true,
					writable: true
				});
				return bound;
			}
		};
	}

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
	PROP = 1, 
	THEME = 2, 
	NEVER = 4,
	LANG = 8, 
	ALWAYS = 16
}

type Templater<R> = (strings: TemplateStringsArray, ...values: any[]) => R;

type TemplateRenderFunction<C extends WebComponent<any, any>, T extends Theme, TR> = (this: C, 
	complexHTML: Templater<TR>,
	props: C['props'], theme: T) => TR;

/**
 * Maps templaters -> components -> functions -> results
 */
const templaterMap: WeakMap<Templater<any>, 
	WeakMap<WebComponent<any, any>, 
		WeakMap<TemplateFn<any, any, any>, 
			//Any = R in TemplateFn
			any|null>>> = new WeakMap();
export type TemplateFnConfig<R> = {
	changeOn: CHANGE_TYPE.NEVER;
	template: R|null;
}|{
	changeOn: CHANGE_TYPE.ALWAYS|CHANGE_TYPE.THEME|CHANGE_TYPE.PROP;
	template: TemplateRenderFunction<any, any, R>
};
type Renderer<T> = (template: T, container: HTMLElement|Element|Node) => any;
export class TemplateFn<C extends WebComponent<any, any> = any, T extends Theme = Theme, 
	R = TemplateResult> {
		private _lastRenderChanged: boolean = true;

		constructor(_template: (TemplateRenderFunction<C, T, R>)|null,
			changeOn: CHANGE_TYPE.NEVER, renderer?: Renderer<R>);
		constructor(_template: (TemplateRenderFunction<C, T, R>),
			changeOn: CHANGE_TYPE.ALWAYS|CHANGE_TYPE.PROP|CHANGE_TYPE.THEME, 
			renderer?: Renderer<R>);
		constructor(private _template: (TemplateRenderFunction<C, T, R>)|null,
			public changeOn: CHANGE_TYPE, 
			private _renderer?: Renderer<R>) { }

		private _renderWithTemplater<TR>(changeType: CHANGE_TYPE, component: C,
			templater: Templater<TR>): {
				changed: boolean;
				rendered: TR
			 } {
				if (!templaterMap.has(templater)) {
					templaterMap.set(templater, new WeakMap());
				}
				const componentTemplateMap = templaterMap.get(templater)!;
				if (!componentTemplateMap.has(component)) {
					componentTemplateMap.set(component, new WeakMap());
				}
				const templateMap = componentTemplateMap.get(component)!;
				if (this.changeOn & CHANGE_TYPE.NEVER) {
					//Never change, return the only render
					const cached = templateMap.get(this);
					if (cached) {
						return {
							changed: false,
							rendered: cached
						}
					}
					const rendered = this._template === null ?
						html`` : (this._template instanceof TemplateResult) ?
							this._template : typeSafeCall(this._template as TemplateRenderFunction<C, T, R|TR>, 
								component, templater, component.props, 
								'getTheme' in component ? 
									(component as unknown as WebComponentThemeManger<any>)
										.getTheme<T>() : null as any);
					templateMap.set(this, rendered);
					return {
						changed: true,
						rendered: rendered as TR
					}
				}
				if (this.changeOn & CHANGE_TYPE.ALWAYS || 
					changeType & CHANGE_TYPE.ALWAYS ||
					this.changeOn & changeType ||
					!templateMap.has(this)) {
						//Change, rerender
						const rendered = typeSafeCall(this._template as TemplateRenderFunction<C, T, R|TR>, 
							component, templater, component.props, 
							'getTheme' in component ? 
								(component as unknown as WebComponentThemeManger<any>)
									.getTheme<T>() : null as any);
						templateMap.set(this, rendered);
						return {
							changed: true,
							rendered: rendered as TR
						}
					}
				
				//No change, return what was last rendered
				return {
					changed: false,
					rendered: templateMap.get(this)!
				};
			}

		private static _textRenderer(strings: TemplateStringsArray, ...values: any[]): string {
			const result: string[] = [strings[0]];
			for (let i = 0; i < values.length; i++) {
				result.push(values[i], strings[i + 1]);
			}
			return result.join('');
		}

		public renderAsText(changeType: CHANGE_TYPE, component: C): string {
			const { changed, rendered } = this._renderWithTemplater(changeType, component,
				TemplateFn._textRenderer);
			this._lastRenderChanged = changed;
			return rendered;
		}

		public renderTemplate(changeType: CHANGE_TYPE, component: C): R {
			const { changed, rendered } = this._renderWithTemplater(changeType, component,
				component.generateHTMLTemplate as unknown as Templater<R>);
			this._lastRenderChanged = changed;
			return rendered;
		}

		public renderSame<TR>(changeType: CHANGE_TYPE, component: C,
			templater: Templater<TR>): TR {
				const { changed, rendered } = this._renderWithTemplater(changeType, component,
					templater);
				this._lastRenderChanged = changed;
				return rendered;
			}

		public render(template: R, target: HTMLElement) {
			if (this._renderer) {
				this._renderer(template, target);
			} else {
				render(<TemplateResult><unknown>template, target);
			}
		}

		public renderIfNew(template: R, target: HTMLElement) {
			if (!this._lastRenderChanged) return;
			if (this._renderer) {
				this._renderer(template, target);
			} else {
				render(<TemplateResult><unknown>template, target);
			}
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
	 * The render method that will render this component's HTML
	 */
	protected abstract html: TemplateFn = new TemplateFn(() => {
		throw new Error('No render method implemented');	
	}, CHANGE_TYPE.ALWAYS);

	/**
	 * The element's constructor
	 */
	protected abstract get self(): typeof ConfiguredComponent;

	/**
	 * The render method that will render this component's css
	 */
	protected abstract css: TemplateFn|TemplateFn[] = new TemplateFn(null, CHANGE_TYPE.NEVER);
	private static ___cssArr: TemplateFn[]|null = null;
	private static get __cssArr(): TemplateFn[] {
		if (this.___cssArr !== null) return this.___cssArr;
		return (this.___cssArr = 
			makeArray((<typeof ConfiguredComponent>this).config.css));
	};
	private static ___privateCSS: TemplateFn[]|null = null;
	private static get __privateCSS(): TemplateFn[] {
		if (this.___privateCSS !== null) return this.___privateCSS;
		return (this.___privateCSS = 
			this.__cssArr.filter((template) => {
				return !(template.changeOn & CHANGE_TYPE.THEME ||
					template.changeOn & CHANGE_TYPE.NEVER);
			}));
	};
	private static __cssSheets: {
		sheet: CSSStyleSheet;
		template: TemplateFn;
	}[]|null = null;

	private static __constructedCSSRendered: boolean = false;
	protected static _constructedCSSChanged(_element: WebComponentBase): boolean {
		// Assume nothing can be changed then, only do first render
		if (this.__constructedCSSRendered) {
			return false;
		}
		this.__constructedCSSRendered = true;
		return true;
	}

	/**
	 * A function signalign whether this component has custom CSS applied to it
	 */
	protected abstract __hasCustomCSS(): boolean;

	/**
	 * The render method that will render this component's css
	 */
	protected abstract customCSS(): TemplateFn|TemplateFn[];

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

	private ___renderContainers: {
		css: HTMLElement[];
		html: HTMLElement;
		customCSS: HTMLElement[];
	}|null = null;
	private __createFixtures() {
		//Attribute is just for clarity when looking through devtools
		const css = (() => {
			return this.self.__cssArr.map(() => {
				const el = document.createElement('span');
				el.setAttribute('data-type', 'css');
				return el;
			});
		})();
		
		const customCSS = (() => {
			if (this.__hasCustomCSS()) {
				return repeat(
					makeArray(this.customCSS()).length).map(() => {
						const el = document.createElement('span');
						el.setAttribute('data-type', 'custom-css');
						return el;
					});
			} else {
				return [];
			}
		})();
		const html = document.createElement('span');
		html.setAttribute('data-type', 'html');
		
		css.forEach(n => this.root.appendChild(n));
		customCSS.forEach(n => this.root.appendChild(n));
		this.root.appendChild(html);

		return {
			css,
			customCSS,
			html
		}
	}
	private get __renderContainers() {
		if (this.___renderContainers) {
			return this.___renderContainers;
		}
		return (this.___renderContainers = this.__createFixtures());
	}

	private static __genConstructedCSS() {
		// Create them
		this.__cssSheets = this.__cssSheets || this.__cssArr.filter((template) => {
			return template.changeOn & CHANGE_TYPE.THEME ||
				template.changeOn & CHANGE_TYPE.NEVER;
		}).map(t => ({
			sheet: new CSSStyleSheet(),
			template: t
		}));
	}

	private get __cssSheets() {
		return this.self.__cssSheets;
	}

	private __sheetsMounted: boolean = false;
	private __renderConstructedCSS(change: CHANGE_TYPE) {
		if (!this.__sheetsMounted) {
			this.self.__genConstructedCSS();

			// Mount them
			this.root.adoptedStyleSheets = this.__cssSheets!.map(s => s.sheet);
			this.__sheetsMounted = true;

			// Force new render
			change = CHANGE_TYPE.ALWAYS;
		}

		if (!(change & CHANGE_TYPE.THEME || change & CHANGE_TYPE.ALWAYS)) {
			// Only render on theme or everything change
			return;
		}

		// Check if it should render at all
		if (!this.self._constructedCSSChanged(this)) {
			return
		}

		this.__cssSheets!.forEach(({ sheet, template }) => {
			sheet.replaceSync(template.renderAsText(change, this).replace(
				/<\/?style>/g, ''));
		});
	}

	private ___canUseConstructedCSS: boolean|null = null;
	private get __canUseConstructedCSS() {
		if (this.___canUseConstructedCSS !== null) {
			return this.___canUseConstructedCSS;
		}
		return (this.___canUseConstructedCSS = (() => {
			try { 
				new CSSStyleSheet(); 
				return true; 
			} catch(e) { 
				return false;
			}
		})());
	}

	@bindToClass
	/**
	 * The method that starts the rendering cycle
	 */
	public renderToDOM(change: CHANGE_TYPE = CHANGE_TYPE.ALWAYS) {
		if (this.__disableRender) return;
		if (this.__doPreRenderLifecycle() === false) {
			return;
		}

		if (this.__canUseConstructedCSS) {
			this.__renderConstructedCSS(change);
		}
		this.self.__privateCSS.forEach((sheet, index) => {
			sheet.renderIfNew(
				sheet.renderTemplate(change, this as any), 
				this.__renderContainers.css[index]);
		});
		if (this.__hasCustomCSS()) {
			makeArray(this.customCSS()).forEach((sheet, index) => {
				sheet.renderIfNew(
					sheet.renderTemplate(change, this as any),
					this.__renderContainers.customCSS[index]);
			});
		}
		this.html.renderIfNew(
			this.html.renderTemplate(change, this as any), 
			this.__renderContainers.html);
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