import { html } from "lit-html";

export const VerticalCentererCSS = html`<style>
	#container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		height: 100%;
	}

	#container.fullscreen {
		height: 100vh;
	}

	#content {
		display: block;
	}
</style>`;