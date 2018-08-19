import { IconButton } from "../../../../../shared/components/util/icon-button/icon-button";
import { Checkmark } from "../../../../../shared/components/icons/checkmark/checkmark";
import { render, html } from "lit-html";

IconButton.define();

render(html`
	<icon-button id="filledText">
		${Checkmark}
	</icon-button>
	<icon-button fill="nontext" id="filledNonText">
		${Checkmark}
	</icon-button>
`, document.getElementById('root')!);