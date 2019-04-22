export { removeAllElementListeners, listenToComponent, listenIfNew, listenWithIdentifier, isNewElement, listen } from './webcomponents/listeners';
export { wait, mapArr, classNames } from './webcomponents/shared';

export function isDefined<U extends string>(value: null|undefined|U): value is U {
	return value !== undefined && value !== null && value !== 'false';
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

export function chain(...functions: Function[]) {
	return (...args: any[]) => {
		functions.forEach(fn => fn(...args));
	}
}

export function makeArray<T>(value: T|T[]): T[] {
	if (Array.isArray(value)) {
		return value;
	}
	return [value];
}