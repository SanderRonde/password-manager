import { classNames } from '../../../lib/webcomponent-util';
import { ColorSize } from '../../icons/color/color';
import { theme } from '../../theming/theme/theme';
import { ThemeSelector } from "./theme-selector";
import { html } from "lit-html";

export function ThemeSelectorHTML(this: ThemeSelector) {
	const currentThemeName = this._globalProperties.theme;
	return html`
		${this.css}
		<div id="container">
			<icon-button id="button" fill="text">${ColorSize(30, 30)}</icon-button>
			<div id="themes">
				${Object.getOwnPropertyNames(theme).map((themeName: keyof typeof theme) => {
					const currentTheme = theme[themeName];
					return html`
						<div class="themeContainer">
							<div class="theme" themename="${themeName}">
								<div class="themeHighligher"
									style="background-color: ${currentTheme.textOnBackground}"
								>
									<div class="themeBackground" 
										style="background-color: ${currentTheme.background}"
									>
										<div class="colorButtons">
											<div class="primaryColor"
												style="background-color: ${currentTheme.primary.main}"
											></div>
											<div class="accentColor"
												style="background-color: ${currentTheme.accent.main}"
											></div>
										</div>
									</div>
								</div>
							</div>
							<div class="${classNames('activeThemeHighlighter', {
								active: themeName === currentThemeName 
							})}"></div>
						</div>
					`
				})}
			</div>
		</div>
	`
}