import { VerticalCenterer } from './vertical-centerer';
import { TemplateFn, CHANGE_TYPE } from 'wclib';

export const VerticalCentererCSS = new TemplateFn<VerticalCenterer>((html) => {
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