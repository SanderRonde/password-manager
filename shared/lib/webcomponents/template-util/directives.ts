import { listenWithIdentifier, isNewElement } from '../../listeners';
import { directive, AttributePart, Directive } from 'lit-html';
import { WebComponent } from '../component';
import { awaitMounted } from './mounting';

const directives: {
	baseMap: WeakMap<WebComponent<any>, WeakMap<Function, Directive<AttributePart>>>;
	fnMap: WeakMap<Function, Directive<AttributePart>>;
} = {
	baseMap: new WeakMap(),
	fnMap: new WeakMap()
};

let listenerIdIndex = 0;
const eventContexts: Map<string, Object> = new Map();
const inlineListenerBases: WeakMap<WebComponent<any>, 
	WeakMap<HTMLElement, Map<string, 
		WeakMap<Function, string>>>> = new WeakMap();
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
			const [ prefix, event, ...rest ] = part.committer.name.split('-');
			if (rest.length > 0) {
				console.warn('Attempting to use inline listener without specifying event');
				return;
			}
			if (!eventContexts.get(event)) {
				eventContexts.set(event, {});
			}
			const eventScope = eventContexts.get(event);
			if (isNewElement(part.committer.element as HTMLElement, eventScope)) {
				if (prefix === 'on') {
					if (!base) {
						console.warn('Attempting to listen to event without a component base');
						return;
					}

					if (!inlineListenerBases.get(base)) {
						inlineListenerBases.set(base, new WeakMap());
					}
					const baseMap = inlineListenerBases.get(base)!;
					if (!baseMap.has(part.committer.element as HTMLElement)) {
						baseMap.set(part.committer.element as HTMLElement, new Map());
					}
					const elementMap = baseMap.get(part.committer.element as HTMLElement)!;
					if (!elementMap.get(event)) {
						elementMap.set(event, new WeakMap());
					}
					const eventMap = elementMap.get(event)!;
					if (!eventMap.has(listener)) {
						eventMap.set(listener, `__inline_listener${listenerIdIndex++}`);
					}
					
					listenWithIdentifier(base, part.committer.element as HTMLElement, eventMap.get(listener)!,
						event as any, listener as any, options);
				} else if (prefix === 'wc') {
					await awaitMounted(part.committer.element as WebComponent<any>);
					(part.committer.element as WebComponent<any>).listen &&
						(part.committer.element as WebComponent<any>).listen(event as any,
							listener as any);
				} else {
					console.warn('Attempting to use inline listener without specifying event');
				}
			}
		});
		fnMap.set(listener, generatedDirective);
		return generatedDirective;
	}

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