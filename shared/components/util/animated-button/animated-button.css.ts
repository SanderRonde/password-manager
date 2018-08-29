import { genTemplateFn, CHANGE_TYPE, renderTemplateFn } from '../../../lib/webcomponents';
import { PaperButtonCSS } from '../paper-button/paper-button.css';
import { AnimatedButton } from './animated-button';
import { html } from "lit-html";

export const COLOR_FADE_TIME = 300;
export const FADE_IN_OUT_TIME = COLOR_FADE_TIME / 2;
export const AnimatedButtonCSS = genTemplateFn<AnimatedButton>(function(_props, theme) {
	return html`<style>
		${renderTemplateFn(PaperButtonCSS, CHANGE_TYPE.THEME, this)}

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
}, CHANGE_TYPE.THEME);