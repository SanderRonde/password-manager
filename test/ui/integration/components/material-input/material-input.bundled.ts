import { MaterialInput } from "../../../../../shared/components/util/material-input/material-input";
import { IconButton } from "../../../../../shared/components/util/icon-button/icon-button";
import { Checkmark } from "../../../../../shared/components/icons/checkmark/checkmark";
import { theme } from "../../../../../shared/components/theming/theme/theme";
import { Cross } from "../../../../../shared/components/icons/cross/cross";
import { WebComponentThemeManger } from "wclib";

import { html, render } from "lit-html";

WebComponentThemeManger.initTheme({
	theme, 
	defaultTheme: 'light'
});
MaterialInput.define();
IconButton.define();

render(html`
	<material-input id="main"></material-input>
	<material-input id="withContent">
		<icon-button id="preIcon" slot="preIcon">${Cross}</icon-button>
		<icon-button id="postIcon" slot="postIcon">${Checkmark}</icon-button>
	</material-input>
	<material-input id="withProps"
		value="somevalue"
		label="somelabel"
		error="someerror"
		pattern="\d{6}"
	></material-input>
	<material-input id="password"
		type="password"
	></material-input>
`, document.getElementById('root')!);