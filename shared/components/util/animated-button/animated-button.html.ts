import { AnimatedButton } from "./animated-button";
import { html } from "lit-html";

export function AnimatedButtonHTML(this: AnimatedButton) {
	return html`
		${this.css}
		<button id="button" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">
			<slot>
		</button>`;
}