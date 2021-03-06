import { PaperButtonCSS } from '../paper-button/paper-button.css';
import { ProjectTheme } from '../../theming/theme/theme.es';
import { AnimatedButton } from './animated-button';
import { TemplateFn, CHANGE_TYPE } from 'wclib';

export const COLOR_FADE_TIME = 300;
export const FADE_IN_OUT_TIME = COLOR_FADE_TIME / 2;
export const AnimatedButtonCSS = new TemplateFn<AnimatedButton, ProjectTheme>(function(html, _props, theme) {
	return html`
		${PaperButtonCSS.renderSame(CHANGE_TYPE.THEME, this, html)}
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