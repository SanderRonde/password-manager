import { WebComponentBase, EventListenerObj, WebComponent, TemplateFn, CHANGE_TYPE, WebComponentComplexValueManager } from './webcomponents';
export { removeAllElementListeners, listenToComponent, listenIfNew, listenWithIdentifier, isNewElement, listen } from './listeners';
import { supportsPassive, isNewElement, listenWithIdentifier } from "./listeners";
import { PaperToast } from '../components/util/paper-toast/paper-toast';
import { directive, AttributePart, DirectiveFn } from 'lit-html';
import { API_ERRS } from '../types/api';

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

export function isDefined<U extends string>(value: null|undefined|U): value is U {
	return value !== undefined && value !== null && value !== 'false';
}

function getterWithVal<R>(component: {
	getParentRef(ref: string): any;
}, value: string|null, strict: boolean, type: 'string'|'number'|'bool'|'complex'): boolean|string|number|undefined|R;
function getterWithVal(component: {
	getParentRef(ref: string): any;
}, value: string|null, strict: boolean, type: 'bool'): boolean;
function getterWithVal(component: {
	getParentRef(ref: string): any;
}, value: string|null, strict: boolean, type: 'string'): string|undefined;
function getterWithVal(component: {
	getParentRef(ref: string): any;
}, value: string|null, strict: boolean, type: 'number'): number|undefined;
function getterWithVal<R>(component: {
	getParentRef(ref: string): any;
}, value: string|null, strict: boolean, type: 'complex'): R|undefined;
function getterWithVal<R>(component: {
	getParentRef(ref: string): any;
}, value: string|null, strict: boolean, type: 'string'|'number'|'bool'|'complex'): boolean|string|number|undefined|R {
	if (type === 'bool') {
		if (strict) {
			return (value + '') === 'true';
		}
		return isDefined(value);
	} else {
		if (isDefined(value)) {
			if (type === 'number') {
				return ~~value;
			} else if (type === 'complex') {
				if (value.startsWith(WebComponentComplexValueManager.refPrefix)) {
					return component.getParentRef(value);
				} else {
					return JSON.parse(decodeURIComponent(value));
				}
			}
			return value;
		}
		return undefined;
	}
}

export function getter<R>(element: HTMLElement & {
	getParentRef(ref: string): any;
}, name: string, strict: boolean, type: 'string'|'number'|'bool'|'complex'): boolean|string|number|undefined|R;
export function getter(element: HTMLElement & {
	getParentRef(ref: string): any;
}, name: string, strict: boolean, type: 'bool'): boolean;
export function getter(element: HTMLElement & {
	getParentRef(ref: string): any;
}, name: string, strict: boolean, type: 'string'): string|undefined;
export function getter(element: HTMLElement & {
	getParentRef(ref: string): any;
}, name: string, strict: boolean, type: 'number'): number|undefined;
export function getter<R>(element: HTMLElement & {
	getParentRef(ref: string): any;
}, name: string, strict: boolean, type: 'complex'): R|undefined;
export function getter<R>(element: HTMLElement & {
	getParentRef(ref: string): any;
}, name: string, strict: boolean, type: 'string'|'number'|'bool'|'complex'): boolean|string|number|undefined|R {
	return getterWithVal(element, element.getAttribute(name), strict, type);
}

export function setter(setAttrFn: (key: string, val: string) => void, 
	removeAttrFn: (key: string) => void, name: string, 
	value: string|boolean|number, type: 'string'|'number'|'bool'|'complex'): void;
export function setter(setAttrFn: (key: string, val: string) => void, 
	removeAttrFn: (key: string) => void, name: string, 
	value: any, type: 'complex'): void;
export function setter(setAttrFn: (key: string, val: string) => void, 
	removeAttrFn: (key: string) => void, name: string, 
	value: boolean, type: 'bool'): void;
export function setter(setAttrFn: (key: string, val: string) => void, 
	removeAttrFn: (key: string) => void, name: string, 
	value: string, type: 'string'): void;
export function setter(setAttrFn: (key: string, val: string) => void, 
	removeAttrFn: (key: string) => void, name: string, 
	value: number, type: 'number'): void;
export function setter(setAttrFn: (key: string, val: string) => void, 
	removeAttrFn: (key: string) => void, name: string, 
	value: string|boolean|number, type: 'string'|'number'|'bool'|'complex'): void {
		if (type === 'bool') {
			const boolVal = value as boolean;
			if (boolVal) {
				setAttrFn(name, '');
			} else {
				removeAttrFn(name);
			}
		} else {
			const strVal = value as string|number;
			if (type === 'complex') {
				try {
					setAttrFn(name, encodeURIComponent(JSON.stringify(strVal)));
				} catch(e) {
					setAttrFn(name, encodeURIComponent('_'));
				}
			} else {
				setAttrFn(name, `${strVal}`);
			}
		}
	}

interface ExactTypeHaver {
	exactType: any;
}

interface Coerced {
	coerce: true;
}

type GetTSType<V extends PROP_TYPE|ComplexType<any>|DefinePropTypeConfig> = 
	V extends PROP_TYPE.BOOL ? boolean : 
		V extends PROP_TYPE.NUMBER ?  number : 
			V extends PROP_TYPE.STRING ? string : 
				V extends ComplexType<infer R> ? R : 
					V extends DefinePropTypeConfig ? 
						V extends ExactTypeHaver ? V['exactType'] :
							V['type'] extends PROP_TYPE.BOOL ? 
								V extends Coerced ? boolean : boolean|undefined : 
							V['type'] extends PROP_TYPE.NUMBER ? 
								V extends Coerced ? number : number|undefined : 
							V['type'] extends PROP_TYPE.STRING ? 
								V extends Coerced ? string : string|undefined : 
							V['type'] extends ComplexType<infer R> ? R :
								void : void;

export const enum PROP_TYPE {
	STRING = 'string',
	NUMBER = 'number',
	BOOL = 'bool'
}
type ComplexType<T> = 'complex' & {
	__data: T;
};

export function ComplexType<T>(): ComplexType<T> {
	return 'complex' as ComplexType<T>;
}

type DefinePropTypes = PROP_TYPE|ComplexType<any>;
interface DefinePropTypeConfig {
	type: DefinePropTypes;
	watch?: boolean;
	defaultValue?: GetTSType<this['type']>;
	value?: GetTSType<this['type']>;
	watchProperties?: string[];
	exactType?: any;
	coerce?: boolean;
	strict?: boolean;
	isPrivate?: boolean;
}

function getDefinePropConfig(value: DefinePropTypes|DefinePropTypeConfig): DefinePropTypeConfig {
	if (typeof value === 'object' && 'type' in value) {
		const data = value as DefinePropTypeConfig;
		return data;
	} else {
		return {
			coerce: false,
			watch: true,
			strict: false,
			isPrivate: false,
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
				Reflect.deleteProperty(obj, prop);
				callback();
				return true;
			}
			return true;
		}
	});
	if (nextLevels.length && Reflect.has(obj, path)) {
		createProxyLevel(obj[path], nextLevels[0], nextLevels.slice(1), callback);
	}
	return proxy;
}

function watchObject(obj: any, path: (string|'*')[], callback: () => void) {
	if (typeof obj !== 'object' || obj === undefined || obj === null) {
		return obj;
	}
	if (path.indexOf('**') !== -1 && path.length > 1) {
		throw new Error('Attempting to watch object through ** and more path operators')
	}
	if (typeof Proxy === 'undefined') {
		console.warn('Attempted to watch object while proxy method is not supported');
		return obj;
	}

	if (path[0] === '**') {
		return createDeepProxy(obj, callback);
	} else {
		return createProxyLevel(obj, path[0], path.slice(1), callback);
	}
}

function watchArray<T>(arr: T[], path: (string|'*')[], callback: () => void): T[] {
	if (!Array.isArray(arr) || arr === undefined || arr === null) {
		return arr;
	}
	if (path.indexOf('**') !== -1 && path.length > 1) {
		throw new Error('Attempting to watch object through ** and more path operators')
	}
	if (typeof Proxy === 'undefined') {
		console.warn('Attempted to watch array while proxy method is not supported');
		return arr;
	}

	return new Proxy(arr, {
		set(arr, property, value) {
			if (typeof property === 'symbol' ||
				(typeof property !== 'number' &&
				!/^\d+$/.test(property))) {
					arr[property as keyof typeof arr] = value;
					return true;
				}
			const index = ~~property;

			if (path.length === 0) {
				//Only watch the setting of values
				arr[index] = value;
				callback();
				return true;
			}

			//Watch the values themselves as well
			arr[index] = watchObject(value, path, callback);
			callback();
			return true;
		},
		deleteProperty(arr, property) {
			if (typeof property === 'symbol' ||
				(typeof property !== 'number' &&
				!/^\d+$/.test(property))) {
					if (Reflect.has(arr, property)) {
						Reflect.deleteProperty(arr, property);
					}
					return true;
				}

			if (Reflect.has(arr, property)) {
				Reflect.deleteProperty(arr, property);
			}
			callback();
			return true;
		}
	});
}

function dashesToCasing(name: string) {
	let newStr = '';
	for (let i = 0; i < name.length; i++) {
		if (name[i] === '-') {
			newStr += name[i + 1].toUpperCase();
			i++;
		} else {
			newStr += name[i];
		}
	}
	return newStr;
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

function getCoerced(initial: any, mapType: DefinePropTypes) {
	switch (mapType) {
		case PROP_TYPE.STRING:
			return initial || '';
		case PROP_TYPE.BOOL:
			return initial || false;
		case PROP_TYPE.NUMBER:
			return initial || 0;
	}
	return initial;
}

type DEFAULT_EVENTS = {
	beforePropChange: {
		args: [string, any, any];
		returnType: void;
	};
	propChange: {
		args: [string, any, any];
		returnType: void;
	}
};
export function defineProps<P extends {
	[key: string]: DefinePropTypes|DefinePropTypeConfig;
}, T extends {
	[key: string]: DefinePropTypes|DefinePropTypeConfig;
}, R extends {
	[K in keyof P]: GetTSType<P[K]>;
} & {
	[K in keyof T]: GetTSType<T[K]>;
}>(element: HTMLElement & {
	renderToDOM(changeType: CHANGE_TYPE): void;
	getParentRef(ref: string): any;
	fire<EV extends keyof DEFAULT_EVENTS, R extends DEFAULT_EVENTS[EV]['returnType']>(
		event: EV, ...params: DEFAULT_EVENTS[EV]['args']): R[]
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
	
	const originalSetAttr = element.setAttribute.bind(element);
	const originalRemoveAttr = element.removeAttribute.bind(element);
	const keyMap: Map<(typeof keys)[0]['key'], {
		watch: boolean;
		coerce: boolean;
		mapType: DefinePropTypes;
		isPrivate: boolean;
		strict: boolean;
	}> = new Map();
	Object.defineProperty(element, 'setAttribute', {
		get() {
			return (key: string, val: string) => {
				const casingKey = dashesToCasing(key)
				if (keyMap.has(casingKey as (typeof keys)[0]['key'])) {
					const { watch, isPrivate, mapType, strict } = keyMap.get(casingKey as (typeof keys)[0]['key'])!;

					const prevVal = (propValues as any)[casingKey];
					const newVal = getterWithVal(element, val, strict, mapType);
					element.fire('beforePropChange', casingKey, prevVal, newVal);
					(propValues as any)[casingKey] = newVal;
					element.fire('propChange', casingKey, prevVal, newVal);
					if (watch) {
						element.renderToDOM(CHANGE_TYPE.PROP);
					}
					if (isPrivate) {
						originalSetAttr(casingKey, '_');
						return;
					}
				} else {
					(propValues as any)[casingKey] = val;
				}
				originalSetAttr(key, val);
			};
		}
	});
	Object.defineProperty(element, 'removeAttribute', {
		get() {
			return (key: string) => {
				const casingKey = dashesToCasing(key);
				if (keyMap.has(casingKey as (typeof keys)[0]['key'])) {
					const { watch, coerce, mapType } = keyMap.get(casingKey as (typeof keys)[0]['key'])!;

					const prevVal = (propValues as any)[casingKey];
					const newVal = coerce ? getCoerced(undefined, mapType) : undefined;
					element.fire('beforePropChange', casingKey, prevVal, newVal);
					(propValues as any)[casingKey] = newVal;
					element.fire('propChange', casingKey, prevVal, newVal);
					if (watch) {
						element.renderToDOM(CHANGE_TYPE.PROP);
					}
				}
				originalRemoveAttr(key);
			}
		}
	})

	for (let i in keys) {
		const { key, reflectToAttr, value } = keys[i];
		const mapKey = key as Extract<keyof P|T, string>;

		const { 
			watch = true,
			coerce = false,
			defaultValue,
			value: defaultValue2,
			type: mapType,
			strict = false,
			isPrivate = false,
			watchProperties = []
		} = getDefinePropConfig(value);

		keyMap.set(key, {
			watch, coerce, mapType, isPrivate, strict
		});

		const propName = casingToDashes(mapKey);
		if (reflectToAttr) {
			Object.defineProperty(element, mapKey, {
				get() {
					if (isPrivate) {
						return propValues[mapKey];
					}
					return getter(element, propName, strict, mapType);
				},
				set(value) {
					const prevVal = props[mapKey];
					element.fire('beforePropChange', key, prevVal, value);
					props[mapKey] = value;
					element.fire('propChange', key, prevVal, value);
				}
			});
		}
		Object.defineProperty(props, mapKey, {
			get() {
				const value = propValues[mapKey];
				if (coerce) {
					return getCoerced(value, mapType);
				}
				return value;

			},
			set(value) {
				const original = value;
				if (typeof value === 'object' && !Array.isArray(value) && watchProperties.length > 0) {
					value = watchObject(value, watchProperties, () => {
						element.renderToDOM(CHANGE_TYPE.PROP)
					});
				} else if (watch && Array.isArray(value)) {
					value = watchArray(value, [], () => {
						element.renderToDOM(CHANGE_TYPE.PROP)
					});
				}

				const prevVal = propValues[mapKey];
				element.fire('beforePropChange', key, prevVal, value);
				propValues[mapKey] = value;
				element.fire('propChange', key, prevVal, value);
				if (reflectToAttr) {
					setter(originalSetAttr, originalRemoveAttr, propName, 
						isPrivate ? '_' : original, mapType);
				}

				if (watch) {
					element.renderToDOM(CHANGE_TYPE.PROP);
				}
			}
		});
		(async () => {
			if (mapType !== 'complex') {
				propValues[mapKey] = getter(element, propName, strict, mapType) as any;
			} else {
				await hookIntoMount(element as any, () => {
					if (!isPrivate || element.getAttribute(propName) !== '_') {
						propValues[mapKey] = getter(element, propName, strict, mapType) as any;
					}
				});
			}
			const defaultVal = defaultValue !== undefined ? 
				defaultValue : defaultValue2;
			if (defaultVal !== undefined && propValues[mapKey] === undefined) {
				propValues[mapKey] = defaultVal as any;
				await hookIntoMount(element as any, () => {
					setter(originalSetAttr, originalRemoveAttr, propName, 
						isPrivate ? '_' : defaultVal, mapType);
				});
			} else if (isPrivate || mapType === 'complex') {
				await hookIntoMount(element as any, () => {
					setter(originalSetAttr, originalRemoveAttr, propName,
						isPrivate ? '_' : propValues[mapKey] as any, mapType);
				});
			}
			await awaitMounted(element as any);
			element.renderToDOM(CHANGE_TYPE.PROP);
		})();
	}
	return props as R;
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

export interface WebComponentConfiguration {
	is: string;
	css: TemplateFn;
	dependencies?: (typeof WebComponentBase|null)[];
	html: TemplateFn;
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
			static config = config;
			config = config;
			renderer = html;
			css = config.css;
		}
		return <any>WebComponentConfig as T;
	}
}

export function wait(time: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
}

const timeouts: WeakMap<any, Map<string, NodeJS.Timer>> = new WeakMap();
export function createCancellableTimeout(el: any, name: string, callback: () => void, waitTime: number) {
	if (!timeouts.has(el)) {
		timeouts.set(el, new Map());
	}
	const elMap = timeouts.get(el)!;
	if (elMap.has(name)) {
		cancelTimeout(el, name);
	}
	elMap.set(name, setTimeout(callback, waitTime));
	return wait(waitTime);
}

export function cancelTimeout(el: any, name: string) {
	if (!timeouts.has(el)) return;

	const elMap = timeouts.get(el)!;
	if (!elMap.has(name)) return;

	clearTimeout(elMap.get(name)!);
	elMap.delete(name);
}

export function setCookie(name: string, value: string, 
	timeout: number = 1000 * 60 * 60 * 6) {
		const date = new Date();
		date.setTime(date.getTime() + timeout);
		const expires = `; expires=${date.toUTCString()}`;
		document.cookie = `${name}=${value}${expires}; path=/`;
	}

export function getCookie(name: string) {
    if (document.cookie.length > 0) {
        let c_start = document.cookie.indexOf(name + "=");
        if (c_start != -1) {
            c_start = c_start + name.length + 1;
            let c_end = document.cookie.indexOf(";", c_start);
            if (c_end == -1) {
                c_end = document.cookie.length;
            }
            return unescape(document.cookie.substring(c_start, c_end));
        }
    }
    return "";
}

interface ColorRepresentation {
	r: number;
	g: number;
	b: number;
	a: number;
}

const HEX_REGEX = /#([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})/;
const HEX_ALPHA_REGEX = /#([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})([a-fA-F\d]{2})/;
const RGB_REGEX = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\s*\)/;
const RGBA_REGEX = /rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d\.)?(\d+)\s*\)/;
const BLACK: ColorRepresentation = {
	r: 0,
	g: 0,
	b: 0,
	a: 100
};

function getColorRepresentation(color: string): ColorRepresentation {
	if (color.startsWith('#') && HEX_ALPHA_REGEX.exec(color)) {
		const match = HEX_ALPHA_REGEX.exec(color);
		if (!match) return BLACK;

		const [ , a, r, g, b ] = match;
		return {
			r: parseInt(r, 16),
			g: parseInt(g, 16),
			b: parseInt(b, 16),
			a: parseInt(a, 16) / 256
		}
	} else if (color.startsWith('#')) {
		const match = HEX_REGEX.exec(color);
		if (!match) return BLACK;

		const [ , r, g, b ] = match;
		return {
			r: parseInt(r, 16),
			g: parseInt(g, 16),
			b: parseInt(b, 16),
			a: 100
		}
	} else if (color.startsWith('rgba')) {
		const match = RGBA_REGEX.exec(color);
		if (!match) return BLACK;

		const [ , r, g, b, preDot, postDot ] = match;
		return {
			r: parseInt(r, 10),
			g: parseInt(g, 10),
			b: parseInt(b, 10),
			a: preDot ? parseInt(postDot, 10) : 100
		}
	} else if (color.startsWith('rgb')) {
		const match = RGB_REGEX.exec(color);
		if (!match) return BLACK;

		const [ , r, g, b ] = match;
		return {
			r: parseInt(r, 10),
			g: parseInt(g, 10),
			b: parseInt(b, 10),
			a: 100
		}
	}
	const mapped = colorNameToHex(color);
	if (mapped.startsWith('#')) {
		return getColorRepresentation(mapped);
	}
	return BLACK;
}

function toStringColor(color: ColorRepresentation) {
	return `rgba(${color.r}, ${color.g}, ${color.b}, ${
		color.a === 100 ? '1' : 
			color.a < 10 ? `0.0${color.a}` : `0.${color.a}`	
	})`;
}

const COLOR_NAME_MAP = {
	"aliceblue": "#f0f8ff",
	"antiquewhite": "#faebd7",
	"aqua": "#00ffff",
	"aquamarine": "#7fffd4",
	"azure": "#f0ffff",
	"beige": "#f5f5dc",
	"bisque": "#ffe4c4",
	"black": "#000000",
	"blanchedalmond": "#ffebcd",
	"blue": "#0000ff",
	"blueviolet": "#8a2be2",
	"brown": "#a52a2a",
	"burlywood": "#deb887",
	"cadetblue": "#5f9ea0",
	"chartreuse": "#7fff00",
	"chocolate": "#d2691e",
	"coral": "#ff7f50",
	"cornflowerblue": "#6495ed",
	"cornsilk": "#fff8dc",
	"crimson": "#dc143c",
	"cyan": "#00ffff",
	"darkblue": "#00008b",
	"darkcyan": "#008b8b",
	"darkgoldenrod": "#b8860b",
	"darkgray": "#a9a9a9",
	"darkgreen": "#006400",
	"darkgrey": "#a9a9a9",
	"darkkhaki": "#bdb76b",
	"darkmagenta": "#8b008b",
	"darkolivegreen": "#556b2f",
	"darkorange": "#ff8c00",
	"darkorchid": "#9932cc",
	"darkred": "#8b0000",
	"darksalmon": "#e9967a",
	"darkseagreen": "#8fbc8f",
	"darkslateblue": "#483d8b",
	"darkslategray": "#2f4f4f",
	"darkslategrey": "#2f4f4f",
	"darkturquoise": "#00ced1",
	"darkviolet": "#9400d3",
	"deeppink": "#ff1493",
	"deepskyblue": "#00bfff",
	"dimgray": "#696969",
	"dimgrey": "#696969",
	"dodgerblue": "#1e90ff",
	"firebrick": "#b22222",
	"floralwhite": "#fffaf0",
	"forestgreen": "#228b22",
	"fuchsia": "#ff00ff",
	"gainsboro": "#dcdcdc",
	"ghostwhite": "#f8f8ff",
	"gold": "#ffd700",
	"goldenrod": "#daa520",
	"gray": "#808080",
	"green": "#008000",
	"greenyellow": "#adff2f",
	"grey": "#808080",
	"honeydew": "#f0fff0",
	"hotpink": "#ff69b4",
	"indianred": "#cd5c5c",
	"indigo": "#4b0082",
	"ivory": "#fffff0",
	"khaki": "#f0e68c",
	"lavender": "#e6e6fa",
	"lavenderblush": "#fff0f5",
	"lawngreen": "#7cfc00",
	"lemonchiffon": "#fffacd",
	"lightblue": "#add8e6",
	"lightcoral": "#f08080",
	"lightcyan": "#e0ffff",
	"lightgoldenrodyellow": "#fafad2",
	"lightgray": "#d3d3d3",
	"lightgreen": "#90ee90",
	"lightgrey": "#d3d3d3",
	"lightpink": "#ffb6c1",
	"lightsalmon": "#ffa07a",
	"lightseagreen": "#20b2aa",
	"lightskyblue": "#87cefa",
	"lightslategray": "#778899",
	"lightslategrey": "#778899",
	"lightsteelblue": "#b0c4de",
	"lightyellow": "#ffffe0",
	"lime": "#00ff00",
	"limegreen": "#32cd32",
	"linen": "#faf0e6",
	"magenta": "#ff00ff",
	"maroon": "#800000",
	"mediumaquamarine": "#66cdaa",
	"mediumblue": "#0000cd",
	"mediumorchid": "#ba55d3",
	"mediumpurple": "#9370db",
	"mediumseagreen": "#3cb371",
	"mediumslateblue": "#7b68ee",
	"mediumspringgreen": "#00fa9a",
	"mediumturquoise": "#48d1cc",
	"mediumvioletred": "#c71585",
	"midnightblue": "#191970",
	"mintcream": "#f5fffa",
	"mistyrose": "#ffe4e1",
	"moccasin": "#ffe4b5",
	"navajowhite": "#ffdead",
	"navy": "#000080",
	"oldlace": "#fdf5e6",
	"olive": "#808000",
	"olivedrab": "#6b8e23",
	"orange": "#ffa500",
	"orangered": "#ff4500",
	"orchid": "#da70d6",
	"palegoldenrod": "#eee8aa",
	"palegreen": "#98fb98",
	"paleturquoise": "#afeeee",
	"palevioletred": "#db7093",
	"papayawhip": "#ffefd5",
	"peachpuff": "#ffdab9",
	"peru": "#cd853f",
	"pink": "#ffc0cb",
	"plum": "#dda0dd",
	"powderblue": "#b0e0e6",
	"purple": "#800080",
	"rebeccapurple": "#663399",
	"red": "#ff0000",
	"rosybrown": "#bc8f8f",
	"royalblue": "#4169e1",
	"saddlebrown": "#8b4513",
	"salmon": "#fa8072",
	"sandybrown": "#f4a460",
	"seagreen": "#2e8b57",
	"seashell": "#fff5ee",
	"sienna": "#a0522d",
	"silver": "#c0c0c0",
	"skyblue": "#87ceeb",
	"slateblue": "#6a5acd",
	"slategray": "#708090",
	"slategrey": "#708090",
	"snow": "#fffafa",
	"springgreen": "#00ff7f",
	"steelblue": "#4682b4",
	"tan": "#d2b48c",
	"teal": "#008080",
	"thistle": "#d8bfd8",
	"tomato": "#ff6347",
	"turquoise": "#40e0d0",
	"violet": "#ee82ee",
	"wheat": "#f5deb3",
	"white": "#ffffff",
	"whitesmoke": "#f5f5f5",
	"yellow": "#ffff00",
	"yellowgreen": "#9acd32"
};
function colorNameToHex(name: string): string {
	if (name in COLOR_NAME_MAP) {
		return COLOR_NAME_MAP[name as keyof typeof COLOR_NAME_MAP];
	}
	return name;
}

export function changeOpacity(color: string, opacity: number) {
	const colorRepr = getColorRepresentation(color);
	return toStringColor({...colorRepr, a: opacity});
}

export function isDark(color: string) {
	const { r, g, b, a } = getColorRepresentation(color);
	return r * a < 100 && g * a < 100 && b * a < 100;
}

export async function awaitMounted(el: WebComponentBase) {
	const realEl = el as WebComponent;
	if (realEl.isMounted) {
		return;
	}
	await new Promise((resolve) => {
		const originalMounted = realEl.mounted && realEl.mounted.bind(realEl);
		realEl.mounted = () => {
			originalMounted && originalMounted();
			resolve();
		}
	});
}

export async function hookIntoMount(el: WebComponentBase, fn: () => void) {
	const realEl = el as WebComponent;
	if (realEl.isMounted) {
		fn();
		return;
	}
	await new Promise((resolve) => {
		const originalMounted = realEl.mounted && realEl.mounted.bind(realEl);
		realEl.mounted = () => {
			fn();
			originalMounted && originalMounted();
			resolve();
		}
	});
}

export function createNumberList(start: number, end: number) {
	const list = [];
	for (let i = start; i <+ end; i++) {
		list.push(i);
	}
	return list;
}

export function any(arr: boolean[]) {
	for (let i = 0; i < arr.length; i++) {
		if (arr[i]) {
			return i;
		}
	}
	return false;
}

export function createDisposableListener<T extends HTMLElement, E extends keyof HTMLElementEventMap>(
	target: T, event: E, listener: (ev: HTMLElementEventMap[E]) => any, 
	options?: boolean|AddEventListenerOptions) {
		if (options || typeof options === 'boolean' && supportsPassive()) {
			target.addEventListener(event, listener, options);
		} else {
			target.addEventListener(event, listener);
		}
		return () => {
			target.removeEventListener(event, listener);
		}
	}

export function createDisposableWindowListener<E extends keyof WindowEventMap>(
	event: E, listener: (this: Window, ev: WindowEventMap[E]) => any,
	options?: boolean|AddEventListenerOptions) {
		if (options || typeof options === 'boolean' && supportsPassive()) {
			window.addEventListener(event, listener, options);
		} else {
			window.addEventListener(event, listener);
		}
		return () => {
			window.removeEventListener(event, listener);
		}
	}

export function repeat(size: number) {
	return new Array(size).fill(0);
}

export function reportDefaultResponseErrors(response: {
	success:false;
	ERR: API_ERRS;
	error: string;
}, paperToast: typeof PaperToast) {
	switch (response.ERR) {
		case API_ERRS.CLIENT_ERR:
			paperToast.create({
				content: 'Failed to send request',
				buttons: [paperToast.BUTTONS.HIDE],
				duration: 5000
			});
			break;
		case API_ERRS.INVALID_CREDENTIALS:
			paperToast.create({
				content: 'Invalid credentials',
				buttons: [paperToast.BUTTONS.HIDE],
				duration: 5000
			});
			break;
		case API_ERRS.INVALID_PARAM_TYPES:
		case API_ERRS.MISSING_PARAMS:
		case API_ERRS.NO_REQUEST_BODY:
			paperToast.create({
				content: 'Invalid request',
				buttons: [paperToast.BUTTONS.HIDE],
				duration: 5000
			});
			break;
		case API_ERRS.SERVER_ERROR:
			paperToast.create({
				content: 'Server error',
				buttons: [paperToast.BUTTONS.HIDE],
				duration: 5000
			});
			break;
		case API_ERRS.TOO_MANY_REQUESTS:
			paperToast.create({
				content: 'Too many requests',
				buttons: [paperToast.BUTTONS.HIDE],
				duration: 5000
			});
			break;
	}
}

const directives: {
	baseMap: WeakMap<WebComponent<any>, WeakMap<Function, DirectiveFn<AttributePart>>>;
	fnMap: WeakMap<Function, DirectiveFn<AttributePart>>;
} = {
	baseMap: new WeakMap(),
	fnMap: new WeakMap()
};

let listenerIdIndex = 0;
const eventContexts: Map<string, Object> = new Map();
const inlineListenerBases: WeakMap<WebComponent<any>, Map<string, WeakMap<Function, string>>> =
	new WeakMap();
export function inlineListener<B extends WebComponent<any>>(listener: Function, base?: B,
	options?: boolean | AddEventListenerOptions) {
		if (base && !directives.baseMap.has(base)) {
			directives.baseMap.set(base, new WeakMap());
		}
		const fnMap = base ? 
			directives.baseMap.get(base)! : directives.fnMap;
		const match = fnMap.get(listener);
		if (match) {
			return match;
		}

		const generatedDirective = directive<AttributePart>(async (part) => {
			const [ prefix, event, ...rest ] = part.name.split('-');
			if (rest.length > 0) {
				console.warn('Attempting to use inline listener without specifying event');
				return;
			}
			if (!eventContexts.get(event)) {
				eventContexts.set(event, {});
			}
			const eventScope = eventContexts.get(event);
			if (isNewElement(part.element as HTMLElement, eventScope)) {
				if (prefix === 'on') {
					if (!base) {
						console.warn('Attempting to listen to event without a component base');
						return;
					}

					if (!inlineListenerBases.get(base)) {
						inlineListenerBases.set(base, new Map());
					}
					const baseMap = inlineListenerBases.get(base)!;
					if (!baseMap.get(event)) {
						baseMap.set(event, new WeakMap());
					}
					const eventMap = baseMap.get(event)!;
					if (!eventMap.has(listener)) {
						eventMap.set(listener, `__inline_listener${listenerIdIndex++}`);
					}
					
					listenWithIdentifier(base, part.element as HTMLElement, eventMap.get(listener)!,
						event as any, listener as any, options);
				} else if (prefix === 'wc') {
					await awaitMounted(part.element as WebComponent<any>);
					(part.element as WebComponent<any>).listen &&
						(part.element as WebComponent<any>).listen(event as any,
							listener as any);
				} else {
					console.warn('Attempting to use inline listener without specifying event');
				}
			}
		});
		fnMap.set(listener, generatedDirective);
		return generatedDirective;
	}