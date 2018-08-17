/// <reference types="Cypress" />
import { theme } from '../../../shared/components/theming/theme/theme';
import { Theme } from "../../../shared/types/shared-types";
import { WebComponent } from '../../../shared/lib/webcomponents';

export function iterateThemes(element: Cypress.Chainable<JQuery<WebComponent>>, 
	callback: (currentTheme: Theme) => void) {
		element.then(async (srcEl) => {
			for (const themeName in theme) {
				srcEl.get(0).setGlobalProperty('theme', themeName as keyof typeof theme);
				await callback(theme[themeName as keyof typeof theme]);
			}
		});
	}