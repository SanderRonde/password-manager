import { VerticalCenterer } from './vertical-centerer';
import { Theme } from '../../../types/shared-types';
import { html } from "lit-html";

export function VerticalCentererCSS(this: VerticalCenterer, _theme: Theme, _props: VerticalCenterer['props']) {
	return html`<style>
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
	</style>`
}