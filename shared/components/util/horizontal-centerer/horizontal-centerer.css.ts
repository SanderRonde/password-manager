import { html } from "lit-html";

export function HorizontalCentererCSS() {
	return html`<style>
		#container {
			display: flex;
			flex-direction: row;
			justify-content: center
		}

		#content {
			display: block;
		}
	</style>`
}