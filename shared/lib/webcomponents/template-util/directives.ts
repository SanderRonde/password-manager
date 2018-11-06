import { directive, AttributePart } from 'lit-html';

export function attribute(condition: boolean, value?: string) {
	return directive<AttributePart>(async (part) => {
		const key = part.committer.name.slice(1);
		if (condition) {
			part.committer.element.setAttribute(key, value || key);
		} else {
			part.committer.element.removeAttribute(key);
		}
	});
}