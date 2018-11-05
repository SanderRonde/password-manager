import { WebComponentHierarchyManager } from './hierarchy-manager';
import { theme } from '../../components/theming/theme/theme';
import { DEFAULT_THEME } from '../../types/shared-types';
import { EventListenerObj } from './listener';
import { CHANGE_TYPE } from './base';

const defaultTheme: DEFAULT_THEME = 'light';
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
			|| defaultTheme;
	}

	public getTheme() {
		return theme[this.getThemeName()!];
	}
}