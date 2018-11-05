import { GlobalProperties } from '../../types/shared-types';
import { WebComponent } from './component';
import { WebComponentBase } from './base';
import { ComponentIs } from './configurable';

interface ExtendedProcess extends NodeJS.Process {
	HTMLElement: typeof HTMLElement;
}

export function define(name: string, component: any) {
	if (window.customElements.get(name)) {
		return;
	}
	window.customElements.define(name, component);
}

const elementBase: typeof HTMLElement = typeof HTMLElement !== 'undefined' ? 
	HTMLElement : (<ExtendedProcess>process).HTMLElement;
export abstract class WebComponentDefiner extends elementBase {
	/**
	 * Any dependencies this component depends on
	 */
	public static dependencies: (typeof WebComponentBase|null)[] = [];
	/**
	 * A tuple consisting of the name of the component and its class
	 */
	protected static is: ComponentIs;
	/**
	 * Any internal properties that are only used by the framework
	 */
	protected __internals: {
		/**
		 * Any hooks that should be called after the constructor
		 */
		connectedHooks: (() => void)[];
		/**
		 * Any hooks that should be called after rendering
		 */
		postRenderHooks: (() => void)[];
		/**
		 * Global properties
		 */
		globalProperties: GlobalProperties;
	} = {
		connectedHooks: [],
		postRenderHooks: [],
		globalProperties: undefined as any
	};
	/**
	 * All defined webcomponents
	 */
	protected static defined: string[] = [];

	constructor() {
		super();

		const isConnected = new Promise<void>((resolve) => {
			this.__internals.connectedHooks.push(() => {
				resolve();
			});
		});
		const definer = customElements.get(this.tagName.toLowerCase()) as typeof WebComponentDefiner;
		definer.__listenForFinished(this as any, isConnected);
	}

	private static __finished: boolean = false;
	private static __listeners: {
		component: WebComponent<any, any>;
		constructed: Promise<void>;
	}[] = [];
	protected static async __listenForFinished(component: WebComponent<any, any>, isConstructed: Promise<void>) {
		if (this.__finished) {
			await isConstructed;
			component.isMounted = true;
			component.mounted();
		} else {
			this.__listeners.push({
				component,
				constructed: isConstructed
			});
		}
	}

	/**
	 * Define this component and its dependencies as a webcomponent
	 */
	static define(isRoot: boolean = true) {
		if (isRoot && this.__finished) {
			//Another root is being defined, clear last one
			this.__finished = false;
			this.__listeners = [];
		}

		for (const dependency of this.dependencies) {
			dependency && dependency.define(false);
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
		this.defined.push(this.is.name);

		this.__finishLoad();
	}

	private static __doSingleMount(component: WebComponent<any, any>) {
		return new Promise((resolve) => {
			(window.requestAnimationFrame || window.webkitRequestAnimationFrame)(() => {
				if (component.isMounted) {
					resolve();
					return;
				}
				component.isMounted = true;
				component.mounted();
				resolve();
			});
		});
	}

	private static async __finishLoad() {
		this.__finished = true;
		if (window.requestAnimationFrame || window.webkitRequestAnimationFrame) {
			for (const { component, constructed } of [...this.__listeners]) {
				await constructed;
				await this.__doSingleMount(component);
			}
		} else {
			this.__listeners.forEach(async ({ constructed, component }) => {
				await constructed;
				if (component.isMounted) {
					return;
				}
				component.isMounted = true;
				component.mounted();
			});
		}
	}
}