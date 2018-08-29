import { ANIMATE_TIME } from '../../util/loadable-block/loadable-block.css';
import { CHANGE_TYPE, genTemplateFn } from '../../../lib/webcomponents';
import { GlobalController } from './global-controller';
import { html } from 'lit-html';

export const GlobalControllerCSS = genTemplateFn<GlobalController>(() => {
	return html`<style>
		#content .newpage.invisible {
			opacity: 1;
			display: block;
			transition: opacity ${ANIMATE_TIME}ms ease-in-out;
		}

		#content .newpage.hidden {
			display: none;
		}

		#content .newpage {
			opacity: 0;
		}
	</style>`
}, CHANGE_TYPE.NEVER);