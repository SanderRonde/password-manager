import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { VerticalCenterer } from './vertical-centerer';
import { html } from "lit-html";

export const VerticalCentererCSS = new TemplateFn<VerticalCenterer>(() => {
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
}, CHANGE_TYPE.NEVER);