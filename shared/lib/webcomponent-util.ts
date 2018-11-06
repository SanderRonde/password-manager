export { removeAllElementListeners, listenToComponent, listenIfNew, listenWithIdentifier, isNewElement, listen } from './listeners';
import { TemplateResult } from 'lit-html';

// From https://github.com/JedWatson/classnames

type ClassNamesArg = string|number|{
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
				if (objArg[key]) {
					classes.push(key);
				}
			}
		}
	}

	return classes.join(' ');
}

export function isDefined<U extends string>(value: null|undefined|U): value is U {
	return value !== undefined && value !== null && value !== 'false';
}

export function wait(time: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, time);
	});
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

export function repeat(size: number) {
	return new Array(size).fill(0);
}

export function findElementInPath<E extends HTMLElement>(path: HTMLElement[], query: string): E|null {
	const isId = query.startsWith('#');
	const isClass = query.startsWith('.');
	const sliced = query.slice(1);
	const isTag = !isId && !isClass;
	const lowercase = query.toLowerCase();

	if (query.split('#').length > 2 || query.split('.').length > 2 || 
		query.split(' ').length > 1 || isId && isClass) {
			console.warn('Only basic queries are allowed (single class, id or tagname)');
			return null;
		}

	for (const el of path) {
		if ((isId && el.id === sliced) ||
			(isClass && el.classList && el.classList.contains(sliced)) ||
			(isTag && el.tagName && el.tagName.toLowerCase() === lowercase)) {
				return el as E;
			}
	}
	return null;
}

/**
 * Map an array but return an empty string if its length is 0
 * this avoids the inlining of a complex value 0-length array
 */
export function mapArr(result: any[], fallback: string|TemplateResult = '') {
	if (result.length === 0) {
		return fallback;
	}
	return result;
}