import { ThemeSelector } from './theme-selector';
import { Theme } from '../../../types/shared-types';
import { html } from "lit-html";

export function ThemeSelectorCSS(this: ThemeSelector, theme: Theme, _props: ThemeSelector['props']) {
	return html`<style>
		.themeContainer {
			height: 40px;
			width: 40px;
			cursor: pointer;
		}

		.themeBackground {
			width: 26px;
			height: 26px;
			border-radius: 50%;
			margin-top: 3px;
			margin-left: 3px;
		}

		.themeHighligher {
			width: 32px;
			height: 32px;
			margin: 4px;
			border-radius: 50%;
			position: absolute;
		}
		
		.primaryColor {
			width: 12px;
			height: 12px;
			border-radius: 50%;
			margin-top: 7px;
			margin-left: 3px;
			position: absolute;
		}

		.accentColor {
			width: 8px;
			height: 8px;
			border-radius: 50%;
			position: absolute;
			margin-top: 9px;
			margin-left: 14px;
		}

		.activeThemeHighlighter {
			height: 34px;
			width: 4px;
			right: -5px;
			position: absolute;
			margin-top: 3px;
			opacity: 0;
			background-color: ${theme.textOnBackground};
		}

		.themeContainer:hover .activeThemeHighlighter {
			opacity: 0.2;
		}

		.themeContainer:hover .activeThemeHighlighter.active {
			opacity: 1;
		}

		.activeThemeHighlighter.active {
			opacity: 0.8;
		}

		#themes {
			overflow: hidden;
			transition: transform 250ms ease-in-out;
			transform: translateX(50px);
		}

		#themes.visible {
			transform: translateX(0);
		}
	</style>`
}