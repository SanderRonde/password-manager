import { WebComponentBase } from './base';

export interface EventListenerObj {
	[key: string]: {
		args: any[];
		returnType?: any;
	};
}
export abstract class WebComponentListenable<E extends EventListenerObj> extends WebComponentBase {
	private __listenerMap: {
		[P in keyof E]: Set<(...params: E[P]['args']) => E[P]['returnType']>;
	} = {} as any;

	private __insertOnce<T extends E[keyof E], L extends (...args: T['args']) => T['returnType']>(fns: Set<L>, listener: L) {
		const self = ((...args: T['args']) => {
			fns.delete(self);
			listener(...args);
		}) as L;
		fns.add(self);
	}

	private __assertKeyExists<EV extends keyof T, T extends {
		[P in keyof E]: Set<(...params: E[P]['args']) => E[P]['returnType']>;
	}>(key: EV, value: T) {
		if (!(key in value)) {
			value[key] = new Set();
		}
	}

	public listen<EV extends keyof E>(event: EV, listener: (...args: E[EV]['args']) => E[EV]['returnType'], once: boolean = false) {
		this.__assertKeyExists(event, this.__listenerMap);
		if (once) {
			this.__insertOnce(this.__listenerMap[event], listener);
		} else {
			this.__listenerMap[event].add(listener);
		}
	}

	protected __clearListeners<EV extends keyof E>(event: EV) {
		if (event in this.__listenerMap) {
			this.__listenerMap[event].clear();
		}
	}

	public fire<EV extends keyof E, R extends E[EV]['returnType']>(event: EV, ...params: E[EV]['args']): R[] {
		if (!(event in this.__listenerMap)) {
			return [];
		}

		const set = this.__listenerMap[event];
		const returnValues: R[] = [];
		for (const listener of set.values()) {
			returnValues.push(listener(...params));
		}
		return returnValues;
	}
}