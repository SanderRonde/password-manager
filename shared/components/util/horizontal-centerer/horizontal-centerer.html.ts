import { HorizontalCentererCSS } from "./horizontal-centerer.css";
import { HorizontalCenterer } from "./horizontal-centerer";
import { html } from "lit-html";

export function HorizontalCentererHTML(this: HorizontalCenterer) {
	return html`
		${HorizontalCentererCSS}
		<div id="container">
			<div id="content">
				<slot></slot>
			</div>
		</div>`
}