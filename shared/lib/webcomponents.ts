import { GlobalController } from '../components/entrypoints/global/global-controller';
import { ComponentIs, WebComponentConfiguration } from './webcomponent-util';
import { VALID_THEMES } from '../components/theming/theme/theme';
import { GlobalProperties } from '../types/shared-types';
import { TemplateResult, render } from 'lit-html';
import { bindToClass } from './decorators';


type IDMapFn<IDS> = {
	/**
	 * Query this component's root for given selector
	 */
	<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K] | null;
    <K extends keyof SVGElementTagNameMap>(selector: K): SVGElementTagNameMap[K] | null;
    <E extends Element = Element>(selector: string): E | null;
	(selector: string): HTMLElement|null;
} & IDS;

interface ExtendedProcess extends NodeJS.Process {
	HTMLElement: typeof HTMLElement;
}
const elementBase: typeof HTMLElement = typeof HTMLElement !== 'undefined' ? 
	HTMLElement : (<ExtendedProcess>process).HTMLElement;
abstract class WebComponentDefiner extends elementBase {
	/**
	 * Any dependencies this component depends on
	 */
	public static dependencies: typeof WebComponentBase[] = [];
	/**
	 * A tuple consisting of the name of the component and its class
	 */
	protected static is: ComponentIs;

	/**
	 * Define this component and its dependencies as a webcomponent
	 */
	static define() {
		for (const dependency of this.dependencies) {
			dependency.define();
		}
		if (!this.is) {
			throw new Error('No component definition given (name and class)')
		}
		if (!this.is.name) {
			throw new Error('No name given for component');
		}
		if (!this.is.component) {
			throw new Error('No class given for component');
		}
		define(this.is.name, this.is.component);
	}
}

export abstract class WebComponentBase extends WebComponentDefiner {
	/**
	 * Whether the render method should be temporarily disabled (to prevent infinite loops)
	 */
	private _disableRender: boolean = false;

	/**
	 * Whether this is the first render
	 */
	private _firstRender: boolean = true;

	/**
	 * The render method that will render this component
	 */
	protected abstract renderer: (this: any, props: any) => TemplateResult = () => {
		throw new Error('No render method implemented');	
	};

	/**
	 * Internal properties used by the WebComponent class
	 */
	protected internals = {
		/**
		 * The root of this component's DOM
		 */
		root: this.attachShadow({
			mode: 'open'
		}),
		/**
		 * Any hooks that should be called after rendering
		 */
		postRenderHooks: [] as (() => void)[]
	}
	/**
	 * The properties of this component
	 */
	props: any = {};

	private _doPreRenderLifecycle() {
		this._disableRender = true;
		this.preRender();
		this._disableRender = false;
	}

	private _doPostRenderLifecycle() {
		this.internals.postRenderHooks.forEach(fn => fn());
		if (this._firstRender) {
			this._firstRender = false;
			this.firstRender();
		}
		this.postRender();
	}

	@bindToClass
	/**
	 * The method that starts the rendering cycle
	 */
	public renderToDOM() {
		if (this._disableRender) return;
		this._doPreRenderLifecycle();
		render(this.renderer.apply(this, [this.props]), this.internals.root);
		this._doPostRenderLifecycle();
	}

	/**
	 * A method called before rendering (changing props won't trigger additional re-render)
	 */
	protected preRender() {}
	/**
	 * A method called after rendering
	 */
	protected postRender() {}
	/**
	 * A method called after the very first render
	 */
	protected firstRender() {}
}


export interface EventListenerObj {
	[key: string]: {
		args: any[];
		returnType?: any;
	};
}
abstract class WebComponentListenable<E extends EventListenerObj> extends WebComponentBase {
	private _listenerMap: {
		[P in keyof E]: Set<(...params: E[P]['args']) => E[P]['returnType']>;
	} = {} as any;

	private _insertOnce<T extends E[keyof E], L extends (...args: T['args']) => T['returnType']>(fns: Set<L>, listener: L) {
		const self = ((...args: T['args']) => {
			fns.delete(self);
			listener(...args);
		}) as L;
		fns.add(self);
	}

	private _assertKeyExists<EV extends keyof T, T extends {
		[P in keyof E]: Set<(...params: E[P]['args']) => E[P]['returnType']>;
	}>(key: EV, value: T) {
		if (!(key in value)) {
			value[key] = new Set();
		}
	}

	public listen<EV extends keyof E>(event: EV, listener: (...args: E[EV]['args']) => E[EV]['returnType'], once: boolean = false) {
		this._assertKeyExists(event, this._listenerMap);
		if (once) {
			this._insertOnce(this._listenerMap[event], listener);
		} else {
			this._listenerMap[event].add(listener);
		}
	}

	protected _clearListeners<EV extends keyof E>(event: EV) {
		if (event in this._listenerMap) {
			this._listenerMap[event].clear();
		}
	}

	protected _fire<EV extends keyof E, R extends E[EV]['returnType']>(event: EV, ...params: E[EV]['args']): R[] {
		if (!(event in this._listenerMap)) {
			return [];
		}

		const set = this._listenerMap[event];
		const returnValues: R[] = [];
		for (const listener of set.values()) {
			returnValues.push(listener(...params));
		}
		return returnValues;
	}
}

abstract class WebComponentHierarchyManager<E extends EventListenerObj> extends WebComponentListenable<E & {
	globalPropChange: {
		args: [keyof GlobalProperties, GlobalProperties[keyof GlobalProperties]]
	}	
}> {
	private _children: Set<WebComponentHierarchyManager<any>> = new Set();
	private _parent: WebComponentHierarchyManager<any>|null = null;
	private _isRoot!: boolean;
	protected _globalProperties!: GlobalProperties;

	private _getGlobalProperties() {
		if (!this._isRoot) {
			return {};
		}

		const props: Partial<GlobalProperties> = {};
		for (let i = 0; i < this.attributes.length; i++) {
			const attr = this.attributes[i];
			if (attr.name.startsWith('prop_')) {
				props[attr.name.slice('prop_'.length) as keyof GlobalProperties] = 
					attr.value as GlobalProperties[keyof GlobalProperties];
			}
		}

		return props;
	}

	connectedCallback() {
		this._isRoot = this.hasAttribute('_root');
		this._globalProperties = {...{
			theme: 'light',
		}, ...this._getGlobalProperties()};
		this._registerToParent();
	}

	@bindToClass
	private _registerToParent() {
		let element: HTMLElement|null = this;
		while (element && !(element instanceof (window as any).ShadowRoot) && 
			(element as any) !== document && !(element instanceof DocumentFragment)) {
				element = element.parentNode as HTMLElement|null;
			}

		if (!element) {
			//Ignore this
			return;
		}
		if (<any>element === document) {
			//This is in the light DOM, ignore it since it's the root
			this._isRoot = true;
			return;
		}
		const root = <ShadowRoot><any>element;
		const host = root.host;

		if (!(host instanceof WebComponentHierarchyManager)) {
			return;
		}

		this._parent = host;
		const newProps = {...host.registerChild(this)};
		for (const key in newProps) {
			this._setGlobalProperty(key as keyof typeof newProps, 
				newProps[key as keyof typeof newProps]);
		}
	}

	private _clearNonExistentChildren() {
		for (const child of this._children.values()) {
			if (!this.shadowRoot!.contains(child)) {
				this._children.delete(child);
			}
		}
	}

	public registerChild(element: WebComponentHierarchyManager<any>): GlobalProperties {
		this._clearNonExistentChildren();
		this._children.add(element);
		return this._globalProperties;
	}

	private _setGlobalProperty<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			if (this._globalProperties[key] !== value) {
				this._globalProperties[key] = value;
				this._fire('globalPropChange', key, value);
			}
		}

	protected _setGlobalPropertyFromChild<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			this._setGlobalProperty(key, value);
			if (this._isRoot) {
				for (const child of this._children) {
					child._setGlobalPropertyFromParent(key, value);
				}
			} else if (this._parent) {
				this._parent._setGlobalPropertyFromChild(key, value);
			}
		}

	protected _setGlobalPropertyFromParent<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			this._setGlobalProperty(key, value);
			for (const child of this._children) {
				child._setGlobalPropertyFromParent(key, value);
			}
		}

	public setGlobalProperty<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			this._setGlobalProperty(key, value);
			if (this._parent) {
				this._parent._setGlobalPropertyFromChild(key, value);
			} else if (this._isRoot) {
				this._setGlobalPropertyFromParent(key, value);
			} else {
				console.warn(`Failed to propagate global property "${key}" since this element has no registered parent`);
			}
		}

	public getRoot(): GlobalController {
		if (this._isRoot) {
			return <GlobalController><any>this;
		}
		return this._parent!.getRoot();
	}
}

abstract class WebComponentThemeManger<E extends EventListenerObj> extends WebComponentHierarchyManager<E> {
	constructor() {
		super();

		this.listen('globalPropChange', (prop, value): any => {
			if (prop === 'theme') {
				this._setTheme(value as GlobalProperties['theme']);
			}
		});
	}

	connectedCallback() {
		super.connectedCallback();
		this._setTheme(this._globalProperties.theme);
	}

	private _setTheme(theme: GlobalProperties['theme']) {
		for (const otherTheme of VALID_THEMES) {
			this.classList.remove(otherTheme);
		}
		this.classList.add(theme!);
		this.renderToDOM();
	}

	public getTheme() {
		return this._globalProperties.theme!;
	}
}

export abstract class WebComponent<IDS extends {
	[key: string]: HTMLElement;
} = {}, E extends EventListenerObj = {}> extends WebComponentThemeManger<E> {
	/**
	 * An ID map containing maps between queried IDs and elements,
	 * 	cleared upon render
	 */
	private _idMap: Map<keyof IDS, IDS[keyof IDS]> = new Map();
	public isMounted: boolean = false;

	constructor() {
		super();

		this.internals.postRenderHooks.push(this._clearMap);
	}

	@bindToClass
	/**
	 * Clears the ID map
	 */
	private _clearMap() {
		this._idMap.clear();
	}

	/**
	 * Access this component's children based on their IDs or query something
	 */
	$: IDMapFn<IDS> = (() => {
		const __this = this;
		return new Proxy((selector: string) => {
			return this.internals.root.querySelector(selector) as HTMLElement;
		}, {
			get(_, id) {
				if (typeof id !== 'string') {
					return null;
				}
				const cached = __this._idMap.get(id);
				if (cached) {
					return cached;
				}
				const el = __this.internals.root.getElementById(id);
				if (el) {
					__this._idMap.set(id, el);
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
		return this.internals.root.querySelectorAll(selector);
	}

	/**
	 * Called when the component is mounted to the dom
	 */
	connectedCallback() {
		super.connectedCallback();
		this.renderToDOM();
		this.isMounted = true;
		this.mounted();
	}

	/**
	 * Called when the component is mounted to the dom
	 */
	mounted() {}
}

export class ConfigurableWebComponent<IDS extends {
	[key: string]: HTMLElement;
} = {}, E extends EventListenerObj = {}> extends WebComponent<IDS, E> {
	protected renderer!: (this: any, props: any) => TemplateResult;
	public static config: WebComponentConfiguration;
	get css() { throw new Error('Not implemented'); }
}

export function define(name: string, component: any) {
	if (window.customElements.get(name)) {
		return;
	}
	window.customElements.define(name, component);
}