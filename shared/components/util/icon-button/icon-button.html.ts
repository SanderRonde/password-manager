import { IconButton } from "./icon-button";
import { html } from "lit-html";

export function IconButtonHTML(this: IconButton) {
	return html`
		<button class="mdl-button mdl-js-button mdl-button--icon mdl-js-ripple-effect">
			<slot></slot>
		</button>
	`
}