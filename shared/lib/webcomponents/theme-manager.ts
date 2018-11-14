import { WebComponentHierarchyManager } from './hierarchy-manager';
import { Theme } from '../../types/shared-types';
import { EventListenerObj } from './listener';
import { CHANGE_TYPE } from './base';

const noTheme: Theme = {
	accent: {
		main: '#F00',
		weak: '#F00',
	},
	background: '#000',
	error: '#F00',
	primary: {
		main: '#F00',
		weak: '#F00',
	},
	success: '#0F0',
	text: '#000'
};
export abstract class WebComponentThemeManger<E extends EventListenerObj> extends WebComponentHierarchyManager<E> {
	constructor() {
		super();

		this.listen('globalPropChange', (prop, _): any => {
			if (prop === 'theme') {
				this.__setTheme();
			}
		});
	}

	connectedCallback() {
		super.connectedCallback();
		this.__setTheme();
	}

	private __setTheme() {
		this.renderToDOM(CHANGE_TYPE.THEME);
	}

	public getThemeName() {
		return (this.__internals.globalProperties && this.__internals.globalProperties.theme) 
			|| WebComponentThemeManger.__defaultTheme;
	}

	public getTheme<T extends Theme = Theme>(): T {
		if (WebComponentThemeManger.__theme) {
			if (this.getThemeName() && this.getThemeName() in WebComponentThemeManger.__theme) {
				return WebComponentThemeManger.__theme[this.getThemeName()] as T;
			}
		}
		return noTheme as T;
	}

	private static __theme: {
		[name: string]: Theme;
	}|null = null;
	static setTheme<T extends {
		[name: string]: Theme;
	}>(theme: T, defaultTheme?: Extract<keyof T, string>) {
		this.__theme = theme;
		if (defaultTheme) {
			this.setDefaultTheme(defaultTheme);
		}
	}

	private static __defaultTheme: string;
	static setDefaultTheme<T extends {
		[name: string]: Theme;
	}>(name: Extract<keyof T, string>) {
		this.__defaultTheme = name;
	}

	static getTheme() {
		return this.__theme;
	}
}