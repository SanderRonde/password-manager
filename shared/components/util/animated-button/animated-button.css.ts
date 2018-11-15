import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { PaperButtonCSS } from '../paper-button/paper-button.css';
import { AnimatedButton } from './animated-button';

export const COLOR_FADE_TIME = 300;
export const FADE_IN_OUT_TIME = COLOR_FADE_TIME / 2;
export const AnimatedButtonCSS = new TemplateFn<AnimatedButton>(function(html, _props, theme) {
	return html`
		${PaperButtonCSS.renderTemplate(CHANGE_TYPE.THEME, this)}
		<style>

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