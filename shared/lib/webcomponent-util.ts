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

type GetTSType<V extends PROP_TYPE|JSONType<any>> = V extends PROP_TYPE.BOOL ? 
	boolean : V extends PROP_TYPE.NUMBER ? 
		number : V extends PROP_TYPE.STRING ?
			string : V extends JSONType<infer R> ? R : void;

export const enum PROP_TYPE {
	STRING = 'string',
	NUMBER = 'number',
	BOOL = 'bool'
}
type JSONType<T> = 'json' & {
	__data: T;
}
export function JSONType<T>(): JSONType<T> {
	return 'json' as JSONType<T>;
}

export function defineProps<P extends {
	[key: string]: PROP_TYPE|JSONType<any>;
}, R extends {
	[K in keyof P]: GetTSType<P[K]>;
}>(element: WebComponent, map: P, doRender: () => void): R {
	const propValues: Partial<R> = {};
	const props: Partial<R> = {};

	const keys = Object.getOwnPropertyNames(map);
	for (const key of keys) {
		const mapKey = key as Extract<keyof P, string>;
		Object.defineProperty(element, mapKey, {
			get() {
				return getter(element, mapKey, map[mapKey]);
			},
			set(value) {
				setter(element, mapKey, value, map[mapKey]);
				props[mapKey] = value;
				doRender();
			}
		});
		Object.defineProperty(props, mapKey, {
			get() {
				return propValues[mapKey];
			},
			set(value) {
				propValues[mapKey] = value;
				setter(element, mapKey, value, map[mapKey]);
				doRender();
			}
		});
		propValues[mapKey] = getter(element, mapKey, map[mapKey]) as any;
	}
	return props as R;
}

export class WebComponent extends HTMLElement {
	protected static dependencies: typeof WebComponent[] = [];
	protected static is: [string, typeof WebComponent];
	private _root = this.attachShadow({
		mode: 'closed'
	});

	constructor() {
		super();
		this.__render();
	}

	render(): TemplateResult {
		throw new Error('No render method implemented');
	}
	protected __render() {
		this.render(), this._root
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