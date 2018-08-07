import { AnimatedButton } from "./paper-button";
import { html } from "lit-html";

export function PaperButtonHTML(this: AnimatedButton) {
	return html`
		${this.css}
		<button id="button" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">
			<slot></slot>
			<span>${this.props.content}</span>
		</button>`;
}