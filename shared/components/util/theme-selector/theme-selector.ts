/// <reference path="../../../types/elements.d.ts" />
import { ConfigurableWebComponent } from "../../../lib/webcomponents";
import { config, isNewElement, defineProps, PROP_TYPE } from "../../../lib/webcomponent-util";
import { ThemeSelectorIDMap } from "./theme-selector-querymap";
import { VALID_THEMES_T } from '../../../types/shared-types';
import { ThemeSelectorHTML } from './theme-selector.html';
import { ThemeSelectorCSS } from './theme-selector.css';
import { IconButton } from '../icon-button/icon-button';

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
		if (isNewElement(this.$.button)) {
			this.$.button.addEventListener('click', () => {
				this._toggleAnimation();
			});
		}
		if (isNewElement(this.$.themes)) {
			const themes = [...this.$.themes.querySelectorAll('.theme')];
			for (const theme of themes) {
				if (isNewElement(theme as HTMLElement)) {
					theme.addEventListener('click', () => {
						const name = theme.getAttribute('themename');
						this._animateOut();

						const expire = Date.now() + (60 * 60 * 1000 * 24 * 365.25 * 1000);
						document.cookie = `theme=${name}; expires=${expire}; path=/`;
						this.setGlobalProperty('theme',
							name as VALID_THEMES_T);
					});
				}
			}
		}
	}

	private _isVisible: boolean = false;
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