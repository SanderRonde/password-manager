import { GlobalController } from './global-controller';
import { Theme } from '../../../types/shared-types';
import { html } from 'lit-html';

export const ANIMATE_TIME = 500;
export function GlobalControllerCSS(this: GlobalController, theme: Theme, _props: GlobalController['props']) {
	return html`<style>
		#spinnerContainer {
			display: none;
			position: absolute;
			opacity: 0;
			width: 100vw;
			height: 100vh;
			z-index: 100;
			background-color: ${theme.background};
			transition: opacity ${ANIMATE_TIME}ms ease-in-out;
		}

		#spinnerContainer.visible {
			display: block;
		}

		#spinnerContainer.animate {
			opacity: 1;
		}

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