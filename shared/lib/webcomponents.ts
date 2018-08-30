import { GlobalController } from '../components/entrypoints/global/global-controller';
import { GlobalProperties, Theme, DEFAULT_THEME } from '../types/shared-types';
import { ComponentIs, WebComponentConfiguration } from './webcomponent-util';
import { theme } from '../components/theming/theme/theme';
import { TemplateResult, render, html } from 'lit-html';
import { bindToClass } from './decorators';


type IDMapFn<IDS> = {
	/**
	 * Query this component's root for given selector
	 */
	<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K] | null;
    <K extends keyof SVGElementTagNameMap>(selector: K): SVGElementTagNameMap[K] | null;
    <E extends Element = Element>(selector: string): E | null;
	(selector: string): HTMLElement|null;
} & IDS;

interface ExtendedProcess extends NodeJS.Process {
	HTMLElement: typeof HTMLElement;
}
const elementBase: typeof HTMLElement = typeof HTMLElement !== 'undefined' ? 
	HTMLElement : (<ExtendedProcess>process).HTMLElement;
abstract class WebComponentDefiner extends elementBase {
	/**
	 * Any dependencies this component depends on
	 */
	public static dependencies: typeof WebComponentBase[] = [];
	/**
	 * A tuple consisting of the name of the component and its class
	 */
	protected static is: ComponentIs;

	constructor() {
		super();
		const definer = customElements.get(this.tagName.toLowerCase()) as typeof WebComponentDefiner;
		definer.listenForFinished(this as any);
	}

	private static _finished: boolean = false;
	private static _listeners: WebComponent<any, any>[] = [];
	protected static listenForFinished(component: WebComponent<any, any>) {
		if (this._finished) {
			component.isMounted = true;
			component.mounted();
		} else {
			this._listeners.push(component);
		}
	}

	/**
	 * Define this component and its dependencies as a webcomponent
	 */
	static define(isRoot: boolean = true) {
		if (isRoot && this._finished) {
			//Another root is being defined, clear last one
			this._finished = false;
			this._listeners = [];
		}

		for (const dependency of this.dependencies) {
			dependency.define(false);
		}
		if (!this.is) {
			throw new Error('No component definition given (name and class)')
		}
		if (!this.is.name) {
			throw new Error('No name given for component');
		}
		if (!this.is.component) {
			throw new Error('No class given for component');
		}
		define(this.is.name, this.is.component);

		if (isRoot) {
			this._finishLoad();
		}
	}

	private static _doSingleMount(listener: WebComponent<any, any>) {
		return new Promise((resolve) => {
			(window.requestAnimationFrame || window.webkitRequestAnimationFrame)(() => {
				if (listener.isMounted) {
					resolve();
					return;
				}
				listener.isMounted = true;
				listener.mounted();
				resolve();
			});
		});
	}

	private static async _finishLoad() {
		this._finished = true;
		if (window.requestAnimationFrame || window.webkitRequestAnimationFrame) {
			for (const listener of [...this._listeners]) {
				await this._doSingleMount(listener);
			}
		} else {
			this._listeners.forEach((listener) => {
				if (listener.isMounted) {
					return;
				}
				listener.isMounted = true;
				listener.mounted();
			});
		}
	}
}

export const enum CHANGE_TYPE {
	PROP, THEME, NEVER, ALWAYS
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

type TemplateRenderFunction<T extends WebComponent<any, any>> = (this: T, 
	props: T['props'], theme: Theme, 
	complexHTML: (strings: TemplateStringsArray, ...values: any[]) => TemplateResult) => TemplateResult;

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
	private _changeOn: CHANGE_TYPE;
	private _template: (TemplateRenderFunction<T>)|TemplateResult|null;

	constructor(fn: (TemplateRenderFunction<T>)|null,
		changeType: CHANGE_TYPE.NEVER);
	constructor(fn: (TemplateRenderFunction<T>),
		changeType: CHANGE_TYPE.ALWAYS);
	constructor(fn: (TemplateRenderFunction<T>),
		changeType: CHANGE_TYPE.PROP);
	constructor(fn: (TemplateRenderFunction<T>),
		changeType: CHANGE_TYPE.THEME);
	constructor(fn: (TemplateRenderFunction<T>)|null,
		changeType: CHANGE_TYPE) { 
		if (changeType === CHANGE_TYPE.NEVER) {
				this._changeOn = CHANGE_TYPE.NEVER,
				//Args don't matter here as they aren't used
				this._template = fn ? (fn as any)() : null;
			} else {
				this._changeOn = changeType,
				this._template = fn as any
		}
	}

	public render(changeType: CHANGE_TYPE, component: T) {
		if (!componentTemplateMap.has(component)) {
			componentTemplateMap.set(component, new WeakMap());
		}
		const templateMap = componentTemplateMap.get(component)!;
		if (this._changeOn === CHANGE_TYPE.NEVER) {
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
		if (this._changeOn === CHANGE_TYPE.ALWAYS || 
			changeType === CHANGE_TYPE.ALWAYS ||
			this._changeOn === changeType ||
			!templateMap.has(this)) {
				//Change, rerender
				const rendered = typeSafeCall(this._template as TemplateRenderFunction<T>, 
					component, component.props, component.getTheme(), 
					component.complexHTML);
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
	private _disableRender: boolean = false;

	/**
	 * Whether this is the first render
	 */
	private _firstRender: boolean = true;

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
	protected abstract _hasCustomCSS(): boolean;

	/**
	 * The render method that will render this component's css
	 */
	protected abstract customCSS(): TemplateFn;

	/**
	 * Internal properties used by the WebComponent class
	 */
	protected internals = {
		/**
		 * The root of this component's DOM
		 */
		root: this.attachShadow({
			mode: 'open'
		}),
		/**
		 * Any hooks that should be called after rendering
		 */
		postRenderHooks: [] as (() => void)[]
	}
	/**
	 * The properties of this component
	 */
	props: any = {};

	private _doPreRenderLifecycle() {
		this._disableRender = true;
		const retVal = this.preRender();
		this._disableRender = false;
		return retVal;
	}

	private _doPostRenderLifecycle() {
		this.internals.postRenderHooks.forEach(fn => fn());
		if (this._firstRender) {
			this._firstRender = false;
			this.firstRender();
		}
		this.postRender();
	}

	private _noHTML = html``;

	@bindToClass
	/**
	 * The method that starts the rendering cycle
	 */
	public renderToDOM(change: CHANGE_TYPE = CHANGE_TYPE.ALWAYS) {
		if (this._disableRender) return;
		if (this._doPreRenderLifecycle() === false) {
			return;
		}
		render(html`${this.css.render(change, this as any)}
		${this._hasCustomCSS() ? 
			this.customCSS().render(change, this as any) : 
			this._noHTML}
		${this.renderer.render(change, this as any)}`, 
			this.internals.root);
		this._doPostRenderLifecycle();
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


export interface EventListenerObj {
	[key: string]: {
		args: any[];
		returnType?: any;
	};
}
abstract class WebComponentListenable<E extends EventListenerObj> extends WebComponentBase {
	private _listenerMap: {
		[P in keyof E]: Set<(...params: E[P]['args']) => E[P]['returnType']>;
	} = {} as any;

	private _insertOnce<T extends E[keyof E], L extends (...args: T['args']) => T['returnType']>(fns: Set<L>, listener: L) {
		const self = ((...args: T['args']) => {
			fns.delete(self);
			listener(...args);
		}) as L;
		fns.add(self);
	}

	private _assertKeyExists<EV extends keyof T, T extends {
		[P in keyof E]: Set<(...params: E[P]['args']) => E[P]['returnType']>;
	}>(key: EV, value: T) {
		if (!(key in value)) {
			value[key] = new Set();
		}
	}

	public listen<EV extends keyof E>(event: EV, listener: (...args: E[EV]['args']) => E[EV]['returnType'], once: boolean = false) {
		this._assertKeyExists(event, this._listenerMap);
		if (once) {
			this._insertOnce(this._listenerMap[event], listener);
		} else {
			this._listenerMap[event].add(listener);
		}
	}

	protected _clearListeners<EV extends keyof E>(event: EV) {
		if (event in this._listenerMap) {
			this._listenerMap[event].clear();
		}
	}

	protected _fire<EV extends keyof E, R extends E[EV]['returnType']>(event: EV, ...params: E[EV]['args']): R[] {
		if (!(event in this._listenerMap)) {
			return [];
		}

		const set = this._listenerMap[event];
		const returnValues: R[] = [];
		for (const listener of set.values()) {
			returnValues.push(listener(...params));
		}
		return returnValues;
	}
}

abstract class WebComponentHierarchyManager<E extends EventListenerObj> extends WebComponentListenable<E & {
	globalPropChange: {
		args: [keyof GlobalProperties, GlobalProperties[keyof GlobalProperties]]
	}	
}> {
	private _children: Set<WebComponentHierarchyManager<any>> = new Set();
	private _parent: WebComponentHierarchyManager<any>|null = null;
	private _isRoot!: boolean;
	protected _globalProperties!: GlobalProperties;

	protected _getParent<T extends WebComponentHierarchyManager<any>>(): T|null {
		return this._parent as T;
	}

	private _getGlobalProperties() {
		if (!this._isRoot) {
			return {};
		}

		const props: Partial<GlobalProperties> = {};
		for (let i = 0; i < this.attributes.length; i++) {
			const attr = this.attributes[i];
			if (attr.name.startsWith('prop_')) {
				props[attr.name.slice('prop_'.length) as keyof GlobalProperties] = 
					decodeURIComponent(
						attr.value as GlobalProperties[keyof GlobalProperties] as string);
			}
		}

		return props;
	}

	connectedCallback() {
		this._isRoot = this.hasAttribute('_root');
		this._globalProperties = {...{
			theme: 'light',
		}, ...this._getGlobalProperties()};
		this._registerToParent();
	}

	private _findLocalRoot() {
		let element: Node|null = this.parentNode;
		while (element && !(element instanceof (window as any).ShadowRoot) && 
			(element as any) !== document && !(element instanceof DocumentFragment)) {
				element = element.parentNode as HTMLElement|null;
			}

		if (!element) {
			return null;
		}
		if (<any>element === document) {
			return this;
		}
		const host = element instanceof WebComponentHierarchyManager ?
			element : (<ShadowRoot><any>element).host;

		if (!(host instanceof WebComponentHierarchyManager)) {
			return null;
		}
		return host;
	}

	private _findDirectParents() {
		let element: Node|null = this.parentNode;
		while (element && !(element instanceof (window as any).ShadowRoot) && 
			(element as any) !== document && !(element instanceof DocumentFragment) &&
			!(element instanceof WebComponentHierarchyManager)) {
				element = element.parentNode as HTMLElement|null;
			}

		if (!element) {
			//Ignore this
			return null;
		}
		if (<any>element === document) {
			//This is in the light DOM, ignore it since it's the root
			return this;
		}
		const host = element instanceof WebComponentHierarchyManager ?
			element : (<ShadowRoot><any>element).host;

		if (!(host instanceof WebComponentHierarchyManager)) {
			return null;
		}
		return host;
	}

	private _getRoot() {
		const localRoot = this._findLocalRoot();
		if (localRoot !== null && localRoot !== this) {
			//Found an actual root, use that
			return localRoot;
		}
		return this._findDirectParents();
	}

	@bindToClass
	private _registerToParent() {
		const root = this._getRoot();
		if (root === this) {
			this._isRoot = true;
		} else if (root === null) {
			return;
		}
		
		this._parent = root;
		const newProps = {...root.registerChild(this)};
		for (const key in newProps) {
			this._setGlobalProperty(key as keyof typeof newProps, 
				newProps[key as keyof typeof newProps]);
		}
	}

	private _clearNonExistentChildren() {
		const nodeChildren = Array.prototype.slice.apply(this.children) as HTMLElement[];
		for (const child of this._children.values()) {
			if (!this.shadowRoot!.contains(child) && 
				!nodeChildren.filter(nodeChild => nodeChild.contains(child)).length) {
					this._children.delete(child);
				}
		}
	}

	public registerChild(element: WebComponentHierarchyManager<any>): GlobalProperties {
		this._clearNonExistentChildren();
		this._children.add(element);
		return this._globalProperties;
	}

	private _setGlobalProperty<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			if (this._globalProperties[key] !== value) {
				this._globalProperties[key] = value;
				this._fire('globalPropChange', key, value);
			}
		}

	protected _setGlobalPropertyFromChild<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			this._setGlobalProperty(key, value);
			if (this._isRoot) {
				for (const child of this._children) {
					child._setGlobalPropertyFromParent(key, value);
				}
			} else if (this._parent) {
				this._parent._setGlobalPropertyFromChild(key, value);
			}
		}

	protected _setGlobalPropertyFromParent<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			this._setGlobalProperty(key, value);
			for (const child of this._children) {
				child._setGlobalPropertyFromParent(key, value);
			}
		}

	public getGlobalProperty<P extends keyof GlobalProperties>(key: P): GlobalProperties[P]|undefined {
		if (!this._globalProperties) {
			return undefined;
		}
		return this._globalProperties[key] as any;
	}

	public setGlobalProperty<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			this._setGlobalProperty(key, value);
			if (this._parent) {
				this._parent._setGlobalPropertyFromChild(key, value);
			} else if (this._isRoot) {
				this._setGlobalPropertyFromParent(key, value);
			} else {
				console.warn(`Failed to propagate global property "${key}" since this element has no registered parent`);
			}
		}

	public getRoot(): GlobalController {
		if (this._isRoot) {
			return <GlobalController><any>this;
		}
		return this._parent!.getRoot();
	}
}

const defaultTheme: DEFAULT_THEME = 'light';
abstract class WebComponentThemeManger<E extends EventListenerObj> extends WebComponentHierarchyManager<E> {
	constructor() {
		super();

		this.listen('globalPropChange', (prop): any => {
			if (prop === 'theme') {
				this._setTheme();
			}
		});
	}

	connectedCallback() {
		super.connectedCallback();
		this._setTheme();
	}

	private _setTheme() {
		this.renderToDOM(CHANGE_TYPE.THEME);
	}

	public getThemeName() {
		return (this._globalProperties && this._globalProperties.theme) 
			|| defaultTheme;
	}

	public getTheme() {
		return theme[this.getThemeName()!];
	}
}

type ComplexValue = TemplateFn|Function|Object;
export abstract class WebComponentComplexValueManager<E extends EventListenerObj> extends WebComponentThemeManger<E> {
	public static readonly refPrefix = '___complex_ref';
	private _reffed: ComplexValue[] = [];

	private _genRef(value: ComplexValue) {
		if (this._reffed.indexOf(value) !== -1) {
			return `${WebComponentComplexValueManager.refPrefix}${
				this._reffed.indexOf(value)}`;
		}

		this._reffed.push(value);
		const refIndex = this._reffed.length - 1;
		return `${WebComponentComplexValueManager.refPrefix}${refIndex}`;
	}

	@bindToClass
	public complexHTML(strings: TemplateStringsArray, ...values: any[]) {
		values = values.map((value) => {
			if (value instanceof TemplateFn ||
				(typeof value === 'object' && !(value instanceof TemplateResult)) ||
				typeof value === 'function') {
					return this._genRef(value);
				}
			return value;
		});
		return html(strings, ...values);
	}

	public getRef(ref: string) {
		if (typeof ref !== 'string') {
			return undefined;
		}
		const refNumber = ~~ref.split(WebComponentComplexValueManager.refPrefix)[1];
		return this._reffed[refNumber];
	}

	public getParentRef(ref: string) {
		const parent = this._getParent<WebComponentComplexValueManager<any>>();
		if (!parent) {
			console.warn('Could not find parent of', this, 
				'and because of that could not find ref with id', ref);
			return undefined;
		}
		return parent.getRef(ref);
	}
}

abstract class WebComponentCustomCSSManager<E extends EventListenerObj> extends WebComponentComplexValueManager<E> {
	private __hasCustomCSS: boolean|null = null;
	private _noCustomCSS: TemplateFn = new TemplateFn(null, CHANGE_TYPE.NEVER);

	protected _hasCustomCSS() {
		if (this.__hasCustomCSS !== null) {
			return this.__hasCustomCSS;
		}
		if (!this.hasAttribute('custom-css') ||
			!this.getParentRef(this.getAttribute('custom-css')!)) {
				//No custom CSS applies
				return (this.__hasCustomCSS = false);
			}

		return (this.__hasCustomCSS = true);
	}

	private _getCustomCSS() {
		if (!this._hasCustomCSS()) {
			return this._noCustomCSS;
		}

		return this.getParentRef(this.getAttribute('custom-css')!) as TemplateFn<any>
	}

	protected customCSS() {
		return this._getCustomCSS();
	}
}

type IDMap = Map<string, (this: any, ev: HTMLElementEventMap[keyof HTMLElementEventMap]) => any>;
const listenedToElements: WeakMap<WebComponent, {
	self: IDMap;
	identifiers: Map<string, {
		element: HTMLElement;
		map: IDMap;
	}>;
	elements: Map<string, {
		element: HTMLElement;
		map: IDMap;
	}>
}> = new WeakMap();

let _supportsPassive: boolean|null = null;
export function supportsPassive() {
	if (_supportsPassive !== null) {
		return _supportsPassive;
	}
	_supportsPassive = false;
	try {
		var opts = Object.defineProperty({}, 'passive', {
			get: function() {
				_supportsPassive = true;
			}
		});
		const tempFn = () => {};
		window.addEventListener("testPassive", tempFn, opts);
		window.removeEventListener("testPassive", tempFn, opts);
	} catch (e) {}
	return _supportsPassive;
}

function doListen<I extends {
	[key: string]: HTMLElement;
}, T extends WebComponent<I>, K extends keyof HTMLElementEventMap>(base: T, 
	type: 'element'|'identifier', element: HTMLElement, id: string, 
	event: K, listener: (this: T, ev: HTMLElementEventMap[K]) => any, 
	options?: boolean|AddEventListenerOptions) {
		const boundListener = listener.bind(base);

		if (!listenedToElements.has(base)) {
			listenedToElements.set(base, {
				identifiers: new Map(),
				elements: new Map(),
				self: new Map()
			});
		}

		const { 
			elements: elementIDMap,
			identifiers: identifiersMap
		} = listenedToElements.get(base)!;
		const usedMap = type === 'element' ?
			elementIDMap : identifiersMap;
		if (!usedMap.has(id)) {
			usedMap.set(id, {
				element,
				map: new Map()
			});
		}

		const { map: eventIDMap } = usedMap.get(id)!;
		if (!eventIDMap.has(event)) {
			eventIDMap.set(event, boundListener);
		} else {
			element.removeEventListener(event, eventIDMap.get(event)!);
		}
		if (options !== undefined && options !== null && supportsPassive) {
			element.addEventListener(event, boundListener, options);
		} else {
			element.addEventListener(event, boundListener);
		}
	}

export function listen<I extends {
	[key: string]: HTMLElement;
}, T extends WebComponent<I>, K extends keyof HTMLElementEventMap>(base: T, 
	id: keyof T['$'], event: K, listener: (this: T, ev: HTMLElementEventMap[K]) => any, 
	options?: boolean|AddEventListenerOptions) {
		const element: HTMLElement = (base.$ as any)[id];

		doListen(base, 'element', element, id as string, event, listener, options);
	}

export function listenWithIdentifier<I extends {
	[key: string]: HTMLElement;
}, T extends WebComponent<I>, K extends keyof HTMLElementEventMap>(base: T, element: HTMLElement,
	identifier: string, event: K, listener: (this: T, ev: HTMLElementEventMap[K]) => any, 
	options?: boolean|AddEventListenerOptions) {
		doListen(base, 'identifier', element, identifier, event, listener, options);
	}

const usedElements: WeakSet<HTMLElement> = new WeakSet();
export function isNewElement(element: HTMLElement) {
	if (!element) return false;
	const has = usedElements.has(element);
	if (!has) {
		usedElements.add(element);
	}
	return !has;
}

export function listenIfNew<I extends {
	[key: string]: HTMLElement;
}, T extends WebComponent<I>, K extends keyof HTMLElementEventMap>(base: T, 
	id: keyof T['$'], event: K, listener: (this: T, ev: HTMLElementEventMap[K]) => any, isNew?: boolean,
	options?: boolean|AddEventListenerOptions) {
		const element: HTMLElement = (base.$ as any)[id];
		const isElementNew = typeof isNew === 'boolean' ? isNew : isNewElement(element);

		if (!isElementNew) {
			return;
		}

		listen(base, id, event, listener, options);
	}

export function listenToComponent<T extends WebComponent<any>, K extends keyof HTMLElementEventMap>(base: T,
	event: K, listener: (this: T, ev: HTMLElementEventMap[K]) => any) {
		if (!listenedToElements.has(base)) {
			listenedToElements.set(base, {
				identifiers: new Map(),
				elements: new Map(),
				self: new Map()
			});
		}

		const { self: selfEventMap } = listenedToElements.get(base)!;
		if (!selfEventMap.has(event)) {
			selfEventMap.set(event, listener);
		} else {
			base.removeEventListener(event, selfEventMap.get(event)!);
		}
		base.addEventListener(event, listener);
	}

function removeListeners(element: HTMLElement, map: IDMap) {
	for (const [ event, listener ] of map.entries()) {
		element.removeEventListener(event, listener);
	}
}

export function removeAllElementListeners(base: WebComponent) {
	if (!listenedToElements.has(base)) {
		return;
	}

	const { 
		elements: elementIDMap,
		self: selfEventMap
	} = listenedToElements.get(base)!;
	for (const { map, element } of elementIDMap.values()) {
		removeListeners(element, map);
	}
	removeListeners(base, selfEventMap);
}

export abstract class WebComponent<IDS extends {
	[key: string]: HTMLElement;
} = {}, E extends EventListenerObj = {}> extends WebComponentCustomCSSManager<E> {
	/**
	 * An ID map containing maps between queried IDs and elements,
	 * 	cleared upon render
	 */
	private _idMap: Map<keyof IDS, IDS[keyof IDS]> = new Map();
	protected _disposables: (() => void)[] = [];
	public isMounted: boolean = false;

	constructor() {
		super();

		this.internals.postRenderHooks.push(this._clearMap);
	}

	@bindToClass
	/**
	 * Clears the ID map
	 */
	private _clearMap() {
		this._idMap.clear();
	}

	/**
	 * Access this component's children based on their IDs or query something
	 */
	$: IDMapFn<IDS> = (() => {
		const __this = this;
		return new Proxy((selector: string) => {
			return this.internals.root.querySelector(selector) as HTMLElement;
		}, {
			get(_, id) {
				if (typeof id !== 'string') {
					return null;
				}
				const cached = __this._idMap.get(id);
				if (cached && __this.shadowRoot!.contains(cached)) {
					return cached;
				}
				const el = __this.internals.root.getElementById(id);
				if (el) {
					__this._idMap.set(id, el);
				}
				return el;
			}
		});
	})() as IDMapFn<IDS>

	/**
	 * Apply querySelectorAll to this component's root
	 */
	$$<K extends keyof HTMLElementTagNameMap>(selector: K): NodeListOf<HTMLElementTagNameMap[K]>;
    $$<K extends keyof SVGElementTagNameMap>(selector: K): NodeListOf<SVGElementTagNameMap[K]>;
	$$<E extends Element = Element>(selector: string): NodeListOf<E>;
	$$(selector: string): NodeListOf<HTMLElement> {
		return this.internals.root.querySelectorAll(selector);
	}

	/**
	 * Called when the component is mounted to the dom
	 */
	connectedCallback() {
		super.connectedCallback();
		this.renderToDOM(CHANGE_TYPE.ALWAYS);
		this.layoutMounted();
	}

	/**
	 * Called when the component is unmounted from the dom
	 */
	disconnectedCallback() {
		removeAllElementListeners(this);
		this._disposables.forEach(disposable => disposable());
		this._disposables = [];
		this.isMounted = false;
	}

	/**
	 * Called when the component is mounted to the dom for the first time.
	 * 	This will be part of the "constructor" and will slow down the initial render
	 */
	layoutMounted() {}

	/**
	 * Called when the component is mounted to the dom and is ready to be manipulated
	 */
	mounted() {}
}

export class ConfigurableWebComponent<IDS extends {
	[key: string]: HTMLElement;
} = {}, E extends EventListenerObj = {}> extends WebComponent<IDS, E> {
	protected renderer!: TemplateFn;
	public static config: WebComponentConfiguration;
	public config!: WebComponentConfiguration;
	protected css!: TemplateFn;
}

export function define(name: string, component: any) {
	if (window.customElements.get(name)) {
		return;
	}
	window.customElements.define(name, component);
}