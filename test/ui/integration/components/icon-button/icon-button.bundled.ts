import { WebComponentThemeManger } from "wclib";
import { IconButton } from "../../../../../shared/components/util/icon-button/icon-button";
import { Checkmark } from "../../../../../shared/components/icons/checkmark/checkmark";
import { theme } from "../../../../../shared/components/theming/theme/theme";
import { render, html } from "lit-html";

WebComponentThemeManger.initTheme({
	theme, 
	defaultTheme: 'light'
});
IconButton.define();

render(html`
	<icon-button id="filledText">
		${Checkmark}
	</icon-button>
	<icon-button fill="nontext" id="filledNonText">
		${Checkmark}
	</icon-button>
`, document.getElementById('root')!);