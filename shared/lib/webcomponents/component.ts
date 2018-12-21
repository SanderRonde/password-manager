import { WebComponentCustomCSSManager } from './custom-css-manager';
import { removeAllElementListeners } from './listeners';
import { CHANGE_TYPE, bindToClass } from './base';
import { EventListenerObj } from './listener';
import { Props } from './props';


type IDMapFn<IDS> = {
	/**
	 * Query this component's root for given selector
	 */
	<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K] | null;
    <K extends keyof SVGElementTagNameMap>(selector: K): SVGElementTagNameMap[K] | null;
    <E extends Element = Element>(selector: string): E | null;
	(selector: string): HTMLElement|null;
} & IDS;

type PropChangeEvents = 'beforePropChange'|'propChange';

export abstract class WebComponent<IDS extends {
	[key: string]: HTMLElement;
} = {}, E extends EventListenerObj = {}> extends WebComponentCustomCSSManager<E> {
	/**
	 * An ID map containing maps between queried IDs and elements,
	 * 	cleared upon render
	 */
	private __idMap: Map<keyof IDS, IDS[keyof IDS]> = new Map();
	protected disposables: (() => void)[] = [];
	public isMounted: boolean = false;

	constructor() {
		super();
		this.__internals.postRenderHooks.push(this.__clearMap);
	}

	@bindToClass
	/**
	 * Clears the ID map
	 */
	private __clearMap() {
		this.__idMap.clear();
	}

	/**
	 * Access this component's children based on their IDs or query something
	 */
	$: IDMapFn<IDS> = (() => {
		const __this = this;
		return new Proxy((selector: string) => {
			return this.root.querySelector(selector) as HTMLElement;
		}, {
			get(_, id) {
				if (typeof id !== 'string') {
					return null;
				}
				const cached = __this.__idMap.get(id);
				if (cached && __this.shadowRoot!.contains(cached)) {
					return cached;
				}
				const el = __this.root.getElementById(id);
				if (el) {
					__this.__idMap.set(id, el as IDS[keyof IDS]);
				}
				return el;
			}
		});
	})() as IDMapFn<IDS>

	/**
	 * Apply querySelectorAll to this component's root
	 */
	$$<K extends keyof HTMLElementTagNameMap>(selector: K): NodeListOf<HTMLElementTagNameMap[K]>;
    $$<K extends keyof SVGElementTagNameMap>(selector: K): NodeListOf<SVGElementTagNameMap[K]>;
	$$<E extends Element = Element>(selector: string): NodeListOf<E>;
	$$(selector: string): NodeListOf<HTMLElement> {
		return this.root.querySelectorAll(selector);
	}

	/**
	 * Called when the component is mounted to the dom
	 */
	connectedCallback() {
		super.connectedCallback();
		this.renderToDOM(CHANGE_TYPE.ALWAYS);
		this.layoutMounted();

		this.__internals.connectedHooks.filter(fn => fn());
	}

	/**
	 * Called when the component is unmounted from the dom
	 */
	disconnectedCallback() {
		removeAllElementListeners(this);
		this.disposables.forEach(disposable => disposable());
		this.disposables = [];
		this.isMounted = false;
	}

	/**
	 * Called when the component is mounted to the dom for the first time.
	 * 	This will be part of the "constructor" and will slow down the initial render
	 */
	layoutMounted() {}

	/**
	 * Called when the component is mounted to the dom and is ready to be manipulated
	 */
	mounted() {}

	public listenProp<P extends Props & {
		[key: string]: any;
	}>(event: PropChangeEvents, 
		listener: (key: keyof P, newValue: P[keyof P], oldValue: P[keyof P]) => void,
		once?: boolean): void;
	public listenProp<P extends Props & {
		[key: string]: any;
	}, PK extends keyof P>(event: PropChangeEvents, 
		listener: (key: PK, newValue: P[PK], oldValue: P[PK]) => void,
		once?: boolean): void;
	public listenProp<P extends Props & {
		[key: string]: any;
	}>(event: PropChangeEvents, 
		listener: (key: keyof P, newValue: P[keyof P], oldValue: P[keyof P]) => void,
		once: boolean = false) {
			this._listen(event, listener, once);
		}
}