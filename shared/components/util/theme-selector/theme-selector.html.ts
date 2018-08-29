import { CHANGE_TYPE, genTemplateFn } from '../../../lib/webcomponents';
import { classNames } from '../../../lib/webcomponent-util';
import { ColorSize } from '../../icons/color/color';
import { theme } from '../../theming/theme/theme';
import { ThemeSelector } from "./theme-selector";
import { html } from "lit-html";

export const ThemeSelectorHTML = genTemplateFn<ThemeSelector>(function() {
	const currentThemeName = this.getGlobalProperty('theme');
	return html`
		<div id="container">
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
			<icon-button aria-label="Change theme" id="button" fill="text">${ColorSize(30, 30)}</icon-button>
		</div>
	`
}, CHANGE_TYPE.THEME);