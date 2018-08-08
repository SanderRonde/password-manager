import { TemplateResult, render } from "lit-html";
import { bindToClass } from "./decorators";

// From https://github.com/JedWatson/classnames

const hasOwn = {}.hasOwnProperty;

type ClassNamesArg = string|{
	[key: string]: any;
}|string[]|{
	[key: string]: any;
}[];
export function classNames(...args: ClassNamesArg[]) {
	var classes = [];

	for (const arg of args) {
		if (!arg) continue;

		if (typeof arg === 'string' || typeof arg === 'number') {
			classes.push(arg);
		} else if (Array.isArray(arg) && arg.length) {
			var inner = classNames.apply(null, arg);
			if (inner) {
				classes.push(inner);
			}
		} else if (typeof arg === 'object') {
			const objArg = arg as {
				[key: string]: any;
			};
			for (var key in objArg) {
				if (hasOwn.call(objArg, key) && objArg[key]) {
					classes.push(key);
				}
			}
		}
	}

	return classes.join(' ');
}

export function multiFunctions(...fns: Function[]) {
	return (...args: any[]) => {
		fns.forEach((fn) => {
			fn(...args);
		});
	}
}

export const enum ICON_STATE {
	ENABLED,
	DISABLED,
	HIDDEN
}

export function important(rule: string|number) {
	return `${rule}!important`
}

export function define(name: string, component: any) {
	if (window.customElements.get(name)) {
		return;
	}
	window.customElements.define(name, component);
}

export function isDefined<U>(value: null|undefined|U): value is U {
	return value !== undefined && value !== null;
}

export function getter<R>(element: HTMLElement, name: string, type: 'string'|'number'|'bool'|'json'): boolean|string|number|undefined|R;
export function getter(element: HTMLElement, name: string, type: 'bool'): boolean;
export function getter(element: HTMLElement, name: string, type: 'string'): string|undefined;
export function getter(element: HTMLElement, name: string, type: 'number'): number|undefined;
export function getter<R>(element: HTMLElement, name: string, type: 'json'): R|undefined;
export function getter<R>(element: HTMLElement, name: string, type: 'string'|'number'|'bool'|'json'): boolean|string|number|undefined|R {
	if (type === 'bool') {
		return isDefined(element.getAttribute(name));
	} else {
		const value = element.getAttribute(name);
		if (isDefined(value)) {
			if (type === 'number') {
				return ~~value;
			} else if (type === 'json') {
				return JSON.parse(value);
			}
			return value;
		}
		return undefined;
	}
}

export function setter(element: HTMLElement, name: string, value: string|boolean|number, type: 'string'|'number'|'bool'|'json'): void;
export function setter(element: HTMLElement, name: string, value: number, type: 'json'): void;
export function setter(element: HTMLElement, name: string, value: boolean, type: 'bool'): void;
export function setter(element: HTMLElement, name: string, value: string, type: 'string'): void;
export function setter(element: HTMLElement, name: string, value: number, type: 'number'): void;
export function setter(element: HTMLElement, name: string, value: string|boolean|number, type: 'string'|'number'|'bool'|'json'): void {
	if (type === 'bool') {
		const boolVal = value as boolean;
		if (boolVal) {
			element.setAttribute(name, '');
		} else {
			element.removeAttribute(name);
		}
	} else {
		const strVal = value as string|number;
		if (type === 'json') {
			element.setAttribute(name, JSON.stringify(strVal));
		} else {
			element.setAttribute(name, `${strVal}`);
		}
	}
}

interface ExactTypeHaver {
	exactType: any;
}

interface Coerced {
	coerce: true;
}

type GetTSType<V extends PROP_TYPE|JSONType<any>|DefinePropTypeConfig> = 
	V extends PROP_TYPE.BOOL ? boolean : 
		V extends PROP_TYPE.NUMBER ?  number : 
			V extends PROP_TYPE.STRING ? string : 
				V extends JSONType<infer R> ? R : 
					V extends DefinePropTypeConfig ? 
						V extends ExactTypeHaver ? V['exactType'] :
							V['type'] extends PROP_TYPE.BOOL ? 
								V extends Coerced ? boolean : boolean|undefined : 
							V['type'] extends PROP_TYPE.NUMBER ? 
								V extends Coerced ? number : number|undefined : 
							V['type'] extends PROP_TYPE.STRING ? 
								V extends Coerced ? string : string|undefined : 
							void : void;

export const enum PROP_TYPE {
	STRING = 'string',
	NUMBER = 'number',
	BOOL = 'bool'
}
type JSONType<T> = 'json' & {
	__data: T;
};

export function JSONType<T>(): JSONType<T> {
	return 'json' as JSONType<T>;
}

type DefinePropTypes = PROP_TYPE|JSONType<any>;
interface DefinePropTypeConfig {
	type: DefinePropTypes;
	watch?: boolean;
	defaultValue?: GetTSType<this['type']>;
	watchProperties?: string[];
	exactType?: any;
	coerce?: boolean;
}

function getDefinePropConfig(value: DefinePropTypes|DefinePropTypeConfig): DefinePropTypeConfig {
	if (typeof value === 'object' && 'type' in value) {
		const data = value as DefinePropTypeConfig;
		return data;
	} else {
		return {
			coerce: false,
			watch: true,
			type: value as DefinePropTypes
		}
	}
}

function createDeepProxy(obj: any, callback: () => void) {
	const proxy = new Proxy(obj, {
		set(_obj, prop, value) {
			if (typeof value === 'object') {
				value = createDeepProxy(value, callback);
			}
			obj[prop] = value;
			callback();
			return true;
		},
		deleteProperty(_obj, prop) {
			if (Reflect.has(obj, prop)) {
				const deleted = Reflect.deleteProperty(obj, prop);
				callback();
				return deleted;
			}
			return false;
		}
	});
	for (const key of Object.keys(obj)) {
		createDeepProxy(obj[key], callback);
	}
	return proxy;
}

function createProxyLevel(obj: any, path: string|'*', nextLevels: (string|'*')[], callback: () => void) {
	const proxy = new Proxy(obj, {
		set(_obj, prop, value) {
			if (path === '*' || prop === path) {
				if (nextLevels.length && typeof value === 'object') {
					value = createProxyLevel(value, 
						nextLevels[0], nextLevels.slice(1), callback);
				}
				obj[prop] = value;
				callback();
			} else {
				obj[prop] = value;
			}
			return true;
		},
		deleteProperty(_obj, prop) {
			if (Reflect.has(obj, prop)) {
				const deleted = Reflect.deleteProperty(obj, prop);
				callback();
				return deleted;
			}
			return false;
		}
	});
	if (nextLevels.length && Reflect.has(obj, path)) {
		createProxyLevel(obj[path], nextLevels[0], nextLevels.slice(1), callback);
	}
	return proxy;
}

function watchObject(obj: any, path: (string|'*')[], callback: () => void) {
	if (typeof obj !== 'object' || obj === undefined || obj === null) {
		return;
	}
	if (path.indexOf('**') !== -1 && path.length > 1) {
		throw new Error('Attempting to watch object through ** and more path operators')
	}

	if (path[0] === '**') {
		return createDeepProxy(obj, callback);
	} else {
		return createProxyLevel(obj, path[0], path.slice(1), callback);
	}
}

function casingToDashes(name: string) {
	let newStr = '';
	for (const char of name) {
		const code = char.charCodeAt(0);
		if (code >= 65 && code <= 90) {
			newStr += '-' + char.toLowerCase();
		} else {
			newStr += char;
		}
	}
	return newStr;
}

export function defineProps<P extends {
	[key: string]: DefinePropTypes|DefinePropTypeConfig;
}, T extends {
	[key: string]: DefinePropTypes|DefinePropTypeConfig;
}, R extends {
	[K in keyof P]: GetTSType<P[K]>;
} & {
	[K in keyof T]: GetTSType<T[K]>;
}>(element: HTMLElement & {
	renderToDOM(): void;
}, {
	reflect = {} as P, priv = {} as T
}: {
	reflect?: P;
	priv?: T;
} = {}): R {
	const propValues: Partial<R> = {};
	const props: Partial<R> = {};

	const keys = [...Object.getOwnPropertyNames(reflect).map((key) => {
		return {
			key: key as Extract<keyof P, string>,
			value: reflect[key],
			reflectToAttr: true
		}
	}), ...Object.getOwnPropertyNames(priv).map((key) => {
		return {
			key: key as Extract<keyof T, string>,
			value: priv[key],
			reflectToAttr: false
		}
	})];
	for (const { key, reflectToAttr, value } of keys) {
		const mapKey = key as Extract<keyof P|T, string>;

		const { 
			watch = true,
			coerce = false,
			defaultValue,
			type: mapType,
			watchProperties = []
		} = getDefinePropConfig(value);

		const propName = casingToDashes(mapKey);
		if (reflectToAttr) {
			Object.defineProperty(element, mapKey, {
				get() {
					return getter(element, propName, mapType);
				},
				set(value) {
					props[mapKey] = value;
				}
			});
		}
		Object.defineProperty(props, mapKey, {
			get() {
				const value = propValues[mapKey];
				if (coerce) {
					switch (mapType) {
						case PROP_TYPE.STRING:
							return value || '';
						case PROP_TYPE.BOOL:
							return value || false;
						case PROP_TYPE.NUMBER:
							return value || 0;
					}
				}
				return value;

			},
			set(value) {
				const original = value;
				if (typeof value === 'object' && watchProperties.length > 0) {
					value = watchObject(value, watchProperties, element.renderToDOM);
				}
				propValues[mapKey] = value;
				if (reflectToAttr) {
					setter(element, propName, original, mapType);
				}
				if (watch) {
					element.renderToDOM();
				}
			}
		});
		propValues[mapKey] = getter(element, propName, mapType) as any;
		if (defaultValue !== undefined && propValues[mapKey] === undefined) {
			propValues[mapKey] = defaultValue as any;
			setter(element, propName, defaultValue, mapType);
		}
	}
	return props as R;
}

type IDMapFn<IDS> = {
	/**
	 * Query this component's root for given selector
	 */
	<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K] | null;
    <K extends keyof SVGElementTagNameMap>(selector: K): SVGElementTagNameMap[K] | null;
    <E extends Element = Element>(selector: string): E | null;
	(selector: string): HTMLElement|null;
} & IDS;

abstract class WebComponentDefiner extends HTMLElement {
	/**
	 * Any dependencies this component depends on
	 */
	public static dependencies: typeof WebComponentBase[] = [];
	/**
	 * A tuple consisting of the name of the component and its class
	 */
	protected static is: ComponentIs;

	/**
	 * Define this component and its dependencies as a webcomponent
	 */
	static define() {
		for (const dependency of this.dependencies) {
			dependency.define();
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
	protected abstract renderer: (this: any, props: any) => TemplateResult = () => {
		throw new Error('No render method implemented');	
	};

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
		this.preRender();
		this._disableRender = false;
	}

	private _doPostRenderLifecycle() {
		this.internals.postRenderHooks.forEach(fn => fn());
		if (this._firstRender) {
			this._firstRender = false;
			this.firstRender();
		}
		this.postRender();
	}

	@bindToClass
	/**
	 * The method that starts the rendering cycle
	 */
	public renderToDOM() {
		if (this._disableRender) return;
		this._doPreRenderLifecycle();
		render(this.renderer.apply(this, [this.props]), this.internals.root);
		this._doPostRenderLifecycle();
	}

	/**
	 * A method called before rendering (changing props won't trigger additional re-render)
	 */
	protected preRender() {}
	/**
	 * A method called after rendering
	 */
	protected postRender() {}
	/**
	 * A method called after the very first render
	 */
	protected firstRender() {}
}


interface EventListenerObj {
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

	protected _fire<EV extends keyof E, R extends E[EV]['returnType']>(event: EV, params: E[EV]['args']): R[] {
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

export abstract class WebComponent<IDS extends {
	[key: string]: HTMLElement;
} = {}, E extends EventListenerObj = {}> extends WebComponentListenable<E> {
	/**
	 * An ID map containing maps between queried IDs and elements,
	 * 	cleared upon render
	 */
	private _idMap: Map<keyof IDS, IDS[keyof IDS]> = new Map();

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
				if (cached) {
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
		this.renderToDOM();
	}
}

export class ConfigurableWebComponent<IDS extends {
	[key: string]: HTMLElement;
} = {}, E extends EventListenerObj = {}> extends WebComponent<IDS, E> {
	protected renderer!: (this: any, props: any) => TemplateResult;
	public static config: WebComponentConfiguration;
	get css() { throw new Error('Not implemented'); }
}

export declare abstract class WebComponentInterface extends WebComponent<any, any> {
	static is: ComponentIs;
	loaded: boolean;
}

export type ComponentIs = {
	name: string;
	component: typeof WebComponentBase;
};
export function genIs(name: string, component: typeof WebComponentBase): ComponentIs {
	return {
		name,
		component
	}
}

export function genIsAccessor(name: string, component: () => typeof WebComponentBase): ComponentIs {
	const data: Partial<ComponentIs> = {
		name
	}
	Object.defineProperty(data, 'constructor', {
		get() {
			return component();
		}
	});
	return data as ComponentIs;
}

interface WebComponentConfiguration {
	is: string;
	css: TemplateResult|null;
	dependencies?: typeof WebComponentBase[];
	html: (this: any, props: any) => TemplateResult;
}
export function config(config: WebComponentConfiguration) {
	const {
		is, html,
		dependencies = []	
	} = config;
	return <I extends {
		[key: string]: HTMLElement;
	}, T, E extends EventListenerObj = {}>(target: T): T => {
		const targetComponent = <any>target as typeof WebComponent;
		class WebComponentConfig extends targetComponent<I, E> implements WebComponentBase {
			static is = genIs(is, WebComponentConfig);
			static dependencies = dependencies
			static config: WebComponentConfiguration = config;
			renderer = html;

			private _templateCSS = config.css || html``;
			get css() {
				return this._templateCSS;
			}
		}
		return <any>WebComponentConfig as T;
	}
}

const listenerMap: WeakMap<HTMLElement, Set<string>> = new WeakMap();
export function listen<K extends keyof HTMLElementEventMap>(target: HTMLElement, 
	event: K, listener: (this: HTMLInputElement, ev: HTMLElementEventMap[K]) => any) {
		if (listenerMap.has(target)) {
			const eventSet = listenerMap.get(target)!;
			if (!eventSet.has(event)) {
				target.addEventListener(event, listener as any);
				eventSet.add(event);
			} else {
				//Listener already exists
			}
		} else {
			target.addEventListener(event, listener as any);
			const eventSet = new Set();
			eventSet.add(event);
			listenerMap.set(target, eventSet);
		}
	}

const boundMap: WeakMap<Function, WeakMap<any, Function>> = new WeakMap();
function getBoundFn(listener: Function, bindTarget: any) {
	if (boundMap.has(listener)) {
		const bindMap = boundMap.get(listener)!;
		if (bindMap.has(bindTarget)) {
			return bindMap.get(bindTarget)!;
		}

		const fn = listener.bind(bindTarget);
		bindMap.set(bindTarget, fn);
		return fn;
	} else {
		const fn = listener.bind(bindTarget);
		const map = new WeakMap();
		map.set(bindTarget, fn);
		boundMap.set(listener, map);
		return fn;
	}
}

export function listenAndBind<K extends keyof HTMLElementEventMap>(target: HTMLElement, 
	event: K, listener: (this: HTMLInputElement, ev: HTMLElementEventMap[K]) => any, bindTarget: any) {
		const bound = getBoundFn(listener, bindTarget);
		listen(target, event, bound);	
	}

const usedElements: WeakSet<HTMLElement> = new WeakSet();
export function isNewElement(element: HTMLElement) {
	const has = usedElements.has(element);
	if (!has) {
		usedElements.add(element);
	}
	return !has;
}

export function wait(time: number) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
}