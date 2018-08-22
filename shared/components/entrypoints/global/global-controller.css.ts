import { ANIMATE_TIME } from '../../util/loadable-block/loadable-block.css';
import { GlobalController } from './global-controller';
import { Theme } from '../../../types/shared-types';
import { html } from 'lit-html';

export function GlobalControllerCSS(this: GlobalController, _theme: Theme, _props: GlobalController['props']) {
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
}