import { GlobalController } from '../../components/entrypoints/base/global/global-controller';
import { EventListenerObj, WebComponentListenable } from "./listener";
import { GlobalProperties } from '../../types/shared-types';
import { ConfigurableWebComponent } from './configurable';
import { bindToClass } from '../decorators';

export abstract class WebComponentHierarchyManager<E extends EventListenerObj> extends WebComponentListenable<E & {
	globalPropChange: {
		args: [keyof GlobalProperties, GlobalProperties[keyof GlobalProperties]]
	}
}> {
	private __children: Set<WebComponentHierarchyManager<any>> = new Set();
	private __parent: WebComponentHierarchyManager<any>|null = null;
	private __isRoot!: boolean;

	protected __getParent<T extends WebComponentHierarchyManager<any>>(): T|null {
		return this.__parent as T;
	}

	private __getGlobalProperties() {
		if (!this.__isRoot) {
			return {};
		}

		const props: Partial<GlobalProperties> = {};
		for (let i = 0; i < this.attributes.length; i++) {
			const attr = this.attributes[i];
			if (attr.name.startsWith('prop_')) {
				props[attr.name.slice('prop_'.length) as keyof GlobalProperties] = 
					decodeURIComponent(
						attr.value as GlobalProperties[keyof GlobalProperties] as string);
			}
		}

		return props;
	}

	public get globalProperties() {
		return this.__internals.globalProperties;
	}

	connectedCallback() {
		this.__isRoot = this.hasAttribute('_root');
		this.__internals.globalProperties = {...{
			theme: 'light',
			isWeb: (location.protocol === 'http:' || location.protocol === 'https:') ?
				'true' : 'false'
		}, ...this.__getGlobalProperties()};
		this.__registerToParent();
	}

	private __findLocalRoot() {
		let element: Node|null = this.parentNode;
		while (element && !(element instanceof (window as any).ShadowRoot) && 
			(element as any) !== document && !(element instanceof DocumentFragment)) {
				element = element.parentNode as HTMLElement|null;
			}

		if (!element) {
			return null;
		}
		if (<any>element === document) {
			return this;
		}
		const host = element instanceof WebComponentHierarchyManager ?
			element : (<ShadowRoot><any>element).host;

		if (!(host instanceof WebComponentHierarchyManager)) {
			return null;
		}
		return host;
	}

	private __findDirectParents() {
		let element: Node|null = this.parentNode;
		while (element && !(element instanceof (window as any).ShadowRoot) && 
			(element as any) !== document && !(element instanceof DocumentFragment) &&
			!(element instanceof WebComponentHierarchyManager)) {
				element = element.parentNode as HTMLElement|null;
			}

		if (!element) {
			//Ignore this
			return null;
		}
		if (<any>element === document) {
			//This is in the light DOM, ignore it since it's the root
			return this;
		}
		const host = element instanceof WebComponentHierarchyManager ?
			element : (<ShadowRoot><any>element).host;

		if (!(host instanceof WebComponentHierarchyManager)) {
			return null;
		}
		return host;
	}

	private __getRoot() {
		const localRoot = this.__findLocalRoot();
		if (localRoot !== null && localRoot !== this) {
			//Found an actual root, use that
			return localRoot;
		}
		return this.__findDirectParents();
	}

	@bindToClass
	private __registerToParent() {
		const root = this.__getRoot();
		if (root === this) {
			this.__isRoot = true;
			return;
		} else if (root === null) {
			return;
		}
		
		this.__parent = root;
		const newProps = {...root.registerChild(this)};
		for (const key in newProps) {
			this.__setGlobalProperty(key as keyof typeof newProps, 
				newProps[key as keyof typeof newProps]);
		}
	}

	private __clearNonExistentChildren() {
		const nodeChildren = Array.prototype.slice.apply(this.children) as HTMLElement[];
		for (const child of this.__children.values()) {
			if (!this.shadowRoot!.contains(child) && 
				!nodeChildren.filter(nodeChild => nodeChild.contains(child)).length) {
					this.__children.delete(child);
				}
		}
	}

	public registerChild(element: WebComponentHierarchyManager<any>): GlobalProperties {
		this.__clearNonExistentChildren();
		this.__children.add(element);
		return this.__internals.globalProperties;
	}

	private __setGlobalProperty<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			if (this.__internals.globalProperties[key] !== value) {
				this.__internals.globalProperties[key] = value;
				this.fire('globalPropChange', key, value);
			}
		}

	private __propagateThroughTree<R>(fn: (element: WebComponentHierarchyManager<any>) => R): R[] {
		if (this.__isRoot) {
			const results: R[] = [];
			this.__propagateDown(fn, results);
			return results;
		} else if (this.__parent) {
			return this.__parent.__propagateThroughTree(fn);
		}
		return [];
	}

	private __propagateDown<R>(fn: (element: WebComponentHierarchyManager<any>) => R, results: R[]) {
		results.push(fn(this));

		for (const child of this.__children) {
			child.__propagateDown(fn, results);
		}
	}

	public getGlobalProperty<P extends keyof GlobalProperties>(key: P): GlobalProperties[P]|undefined {
		if (!this.__internals.globalProperties) {
			return undefined;
		}
		return this.__internals.globalProperties[key] as any;
	}

	public setGlobalProperty<P extends keyof GlobalProperties, V extends GlobalProperties[P]>(key: P,
		value: V) {
			if (!this.__parent && !this.__isRoot) {
				console.warn(`Failed to propagate global property "${key}" since this element has no registered parent`);
				return;
			}
			this.__propagateThroughTree((element) => {
				element.__setGlobalProperty(key, value);
			});
		}

	public getRoot(): GlobalController {
		if (this.__isRoot) {
			return <GlobalController><any>this;
		}
		return this.__parent!.getRoot();
	}

	public runGlobalFunction<R>(fn: (element: ConfigurableWebComponent<any>) => R): R[] {
		return this.__propagateThroughTree(fn);
	}
}