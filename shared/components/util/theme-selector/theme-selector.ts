/// <reference path="../../../types/elements.d.ts" />
import { 
	ConfigurableWebComponent, config, Props, 
	PROP_TYPE, bindToClass, isNewElement, listenWithIdentifier 
} from "wclib";
import { ThemeSelectorIDMap, ThemeSelectorClassMap } from "./theme-selector-querymap";
import { VALID_THEMES_T, GlobalProperties } from '../../../types/shared-types';
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
export class ThemeSelector extends ConfigurableWebComponent<{
	IDS: ThemeSelectorIDMap;
	CLASSES: ThemeSelectorClassMap;
}> {
	props = Props.define(this, {
		reflect: {
			currentTheme: {
				type: PROP_TYPE.STRING,
				actualType: '' as VALID_THEMES_T
			}
		}
	})

	constructor() {
		super();

		this.listenGP<GlobalProperties, 'theme'>('globalPropChange', (key, value) => {
			if (key === 'theme') {
				this.props.currentTheme = value;
			}
		});
	}

	postRender() {
		if (isNewElement(this.$.themes)) {
			const themes = [...this.$.themes.querySelectorAll('.theme')];
			for (let i in themes) {
				const theme = themes[i];
				if (isNewElement(theme as HTMLElement)) {
					listenWithIdentifier(this, theme as HTMLElement,
						`__theme${i}`, 'click', () => {
							const name = theme.getAttribute('themename');
							this._animateOut();

							const expire = Date.now() + (60 * 60 * 1000 * 24 * 365.25 * 1000);
							document.cookie = `theme=${name}; expires=${expire}; path=/`;
							this.globalProps<GlobalProperties>().set('theme',
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
	public toggleAnimation() {
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