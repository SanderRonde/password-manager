import { PaperButtonCSS } from '../paper-button/paper-button.css';
import { AnimatedButton } from './animated-button';
import { Theme } from '../../../types/shared-types';
import { html } from "lit-html";

export const COLOR_FADE_TIME = 300;
export const FADE_IN_OUT_TIME = COLOR_FADE_TIME / 2;
export function AnimatedButtonCSS(this: AnimatedButton, theme: Theme, props: AnimatedButton['props']) {
	return html`<style>
		${PaperButtonCSS.bind(this)(theme, props)}

		#content > * {
			display: none;
			transition: opacity ${FADE_IN_OUT_TIME}ms ease-in-out;
		}

		#content > *.visible {
			display: block;
		}

		#content.fadeOut > * {
			opacity: 0;
		}

		#loadingContent {
			margin-top: 4px;
		}

		#successContent, #failureContent {
			fill: white;
		}

		#button {
			transition: background ${COLOR_FADE_TIME}ms ease-in-out;
		}

		.success {
			background: ${theme.success}
		}
		.failure {
			background: ${theme.error}
		}
	</style>`
}