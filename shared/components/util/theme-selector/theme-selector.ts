/// <reference path="../../../types/elements.d.ts" />
import { config, isNewElement, defineProps, PROP_TYPE, listenIfNew, listenWithIdentifier } from "../../../lib/webcomponent-util";
import { ConfigurableWebComponent } from "../../../lib/webcomponents";
import { ThemeSelectorIDMap } from "./theme-selector-querymap";
import { VALID_THEMES_T } from '../../../types/shared-types';
import { ThemeSelectorHTML } from './theme-selector.html';
import { ThemeSelectorCSS } from './theme-selector.css';
import { IconButton } from '../icon-button/icon-button';
import { bindToClass } from '../../../lib/decorators';

@config({
	is: 'theme-selector',
	css: ThemeSelectorCSS,
	html: ThemeSelectorHTML,
	dependencies: [
		IconButton
	]
})
export class ThemeSelector extends ConfigurableWebComponent<ThemeSelectorIDMap> { 
	props = defineProps(this, {
		reflect: {
			currentTheme: {
				type: PROP_TYPE.STRING,
				actualType: '' as VALID_THEMES_T
			}
		}
	})

	constructor() {
		super();

		this.listen('globalPropChange', (key, value) => {
			if (key === 'theme') {
				this.props.currentTheme = value;
			}
		});
	}

	postRender() {
		listenIfNew(this, 'button', 'click', this._toggleAnimation);
		if (isNewElement(this.$.themes)) {
			const themes = [...this.$.themes.querySelectorAll('.theme')];
			for (let i in themes) {
				const theme = themes[i];
				if (isNewElement(theme as HTMLElement)) {
					listenWithIdentifier(this, theme as HTMLElement,
						`theme${i}`, 'click', () => {
						const name = theme.getAttribute('themename');
						this._animateOut();

						const expire = Date.now() + (60 * 60 * 1000 * 24 * 365.25 * 1000);
						document.cookie = `theme=${name}; expires=${expire}; path=/`;
						this.setGlobalProperty('theme',
							name as VALID_THEMES_T);

						if (navigator.serviceWorker.controller) {
							navigator.serviceWorker.controller.postMessage({
								type: 'setCookie',
								data: {
									theme: name
								}
							});	
						}
					});
				}
			}
		}
	}

	private _isVisible: boolean = false;
	@bindToClass
	private _toggleAnimation() {
		if (this._isVisible) {
			this._animateOut();
		} else {
			this._animateIn();
		}
	}

	private _animateIn() {
		this._isVisible = true;
		this.$.themes.classList.add('visible');
	}

	private _animateOut() {
		this._isVisible = false;
		this.$.themes.classList.remove('visible');
	}
}