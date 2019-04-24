import { HorizontalCenterer } from './horizontal-centerer';
import { TemplateFn, CHANGE_TYPE } from 'wclib';

export const HorizontalCentererCSS = new TemplateFn<HorizontalCenterer>((html) => {
	return html`<style>
		#container {
			display: flex;
			flex-direction: row;
			justify-content: center
		}

		#container.fullscreen {
			width: 100vw;
		}

		#content {
			display: block;
		}
	</style>`
}, CHANGE_TYPE.NEVER);