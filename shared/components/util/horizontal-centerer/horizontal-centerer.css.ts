import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { HorizontalCenterer } from './horizontal-centerer';
import { html } from "lit-html";

export const HorizontalCentererCSS = new TemplateFn<HorizontalCenterer>(() => {
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
}, CHANGE_TYPE.NEVER);