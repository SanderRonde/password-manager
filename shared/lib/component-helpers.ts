export function optionalClassName(name: string, enable: boolean) {
	if (enable) {
		return ' ' + name;
	}
	return '';
}

export function toggleClassname(name1: string, name2: string, useFirst: boolean) {
	return ' ' + (useFirst ? name1 : name2);
}