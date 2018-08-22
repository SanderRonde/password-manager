import { Theme } from '../../../types/shared-types';
import { LoadableBlock } from './loadable-block';
import { html } from "lit-html";

export const ANIMATE_TIME = 500;
export function LoadableBlockCSS(this: LoadableBlock, theme: Theme, _props: LoadableBlock['props']) {
	return html`<style>
		:host {
			display: block;
		}

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
	</style>`
}