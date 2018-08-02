import { html } from "lit-html";

export const HorizontalCentererCSS = html`<style>
	#container {
		display: flex;
		flex-direction: row;
		justify-content: center
	}

	#content {
		display: block;
	}
</style>`;