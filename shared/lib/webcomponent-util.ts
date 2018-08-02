import { TemplateResult, render } from "lit-html";

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
			newStr += `-${char.toLowerCase()}`;
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
}>(element: HTMLElement, reflect: P, priv: T, doRender: () => void): R {
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
			watch,
			coerce,
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
					setter(element, propName, value, mapType);
					props[mapKey] = value;
					if (watch) {
						doRender();
					}
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
					value = watchObject(value, watchProperties, doRender);
				}
				propValues[mapKey] = value;
				if (reflectToAttr) {
					setter(element, propName, original, mapType);
				}
				if (watch) {
					doRender();
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

export class WebComponent extends HTMLElement {
	protected static dependencies: typeof WebComponent[] = [];
	protected static is: [string, typeof WebComponent];
	private _root = this.attachShadow({
		mode: 'closed'
	});

	__toBind!: ((__this: any) => void)[];
	__doBinds(__this: this) {
		if (!this.__toBind) {
			return;
		}
		this.__toBind.forEach((fn) => {
			fn(__this);
		});
	}

	render(): TemplateResult {
		throw new Error('No render method implemented');
	}
	protected __preRender() {}
	protected __render() {
		this.__preRender();
		render(this.render(), this._root);
		this.__postRender();
	}
	protected __postRender() {}

	$<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K] | null;
    $<K extends keyof SVGElementTagNameMap>(selector: K): SVGElementTagNameMap[K] | null;
    $<E extends Element = Element>(selector: string): E | null;
	$(selector: string): HTMLElement|null {
		return this._root.querySelector(selector);
	}

	$$<K extends keyof HTMLElementTagNameMap>(selector: K): NodeListOf<HTMLElementTagNameMap[K]>;
    $$<K extends keyof SVGElementTagNameMap>(selector: K): NodeListOf<SVGElementTagNameMap[K]>;
	$$<E extends Element = Element>(selector: string): NodeListOf<E>;
	$$(selector: string): NodeListOf<HTMLElement> {
		return this._root.querySelectorAll(selector);
	}

	static define() {
		for (const dependency of this.dependencies) {
			dependency.define();
		}
		if (!this.is || this.is.length !== 2) {
			throw new Error('No name given for component');
		}
		define(this.is[0], this.is[1]);
	}
}

export function genIs(name: string, component: typeof WebComponent): [string, typeof WebComponent] {
	return [name, component];
}