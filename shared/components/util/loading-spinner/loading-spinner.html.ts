import { LoadingSpinner } from "./loading-spinner";
import { html } from "lit-html";

export function LoadingSpinnerHTML(this: LoadingSpinner) {
	return html`
		<div id="container" class="mdl-spinner mdl-js-spinner is-active"></div>
	`;
}