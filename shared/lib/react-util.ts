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