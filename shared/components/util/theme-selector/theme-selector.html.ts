import { CHANGE_TYPE, TemplateFn } from '../../../lib/webcomponents';
import { mapArr } from '../../../lib/webcomponent-util';
import { ColorSize } from '../../icons/color/color';
import { theme } from '../../theming/theme/theme';
import { ThemeSelector } from "./theme-selector";

export const ThemeSelectorHTML = new TemplateFn<ThemeSelector>(function(html) {
	const currentThemeName = this.getGlobalProperty('theme');
	return html`
		<div id="container">
			<icon-button aria-label="Change theme" id="button" fill="text"
				@click="${this.toggleAnimation}"
				>${ColorSize(30, 30)}</icon-button>
			<div id="themes">
				${mapArr(Object.getOwnPropertyNames(theme).map((themeName: keyof typeof theme) => {
					const currentTheme = theme[themeName];
					return html`
						<div class="themeContainer">
							<div class="theme" themename="${themeName}">
								<div class="themeHighligher"
									style="${"background-color: " + currentTheme.text}"
								>
									<div class="themeBackground" 
										style="${"background-color: " + currentTheme.background}"
									>
										<div class="colorButtons">
											<div class="primaryColor"
												style="${"background-color: " + currentTheme.primary.main}"
											></div>
											<div class="accentColor"
												style="${"background-color: " + currentTheme.accent.main}"
											></div>
										</div>
									</div>
								</div>
							</div>
							<div class="${['activeThemeHighlighter', {
								active: themeName === currentThemeName 
							}]}"></div>
						</div>
					`
				}))}
			</div>
		</div>
	`
}, CHANGE_TYPE.THEME);