import { IconButton } from "./icon-button";
import { html } from "lit-html";

export function IconButtonHTML(this: IconButton, props: IconButton['props']) {
	return html`
		${this.css}
		<button class="mdl-button mdl-js-button mdl-button--icon mdl-js-ripple-effect"
			aria-label="${props.label}"
		>
			<slot></slot>
		</button>
	`
}