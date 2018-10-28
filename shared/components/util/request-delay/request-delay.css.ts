import { changeOpacity, isDark } from '../../../lib/webcomponent-util';
import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { RequestDelay } from './request-delay';
import { html } from 'lit-html';

export const RequestDelayCSS = new TemplateFn<RequestDelay>(function (_, theme) {
	return html`<style>
		:host(.show.move) #outerContainer {
			-webkit-transform: translateY(-60px);
			transform: translateY(-60px);
		}

		#animationLine {
			width: 100%;
			height: 3px;
			transform-origin: left;
			background-color: ${theme.accent.main};
		}

		#outerContainer {
			position: fixed;
			-webkit-transition: -webkit-transform 0.3s, opacity 0.3s;
			transition: transform 0.3s, opacity 0.3s;
			opacity: 0;
			bottom: 0;
			-webkit-transform: translateY(100px);
			transform: translateY(100px);
			z-index: 10000;
			margin: 12px;
		}

		#toastContainer {
			display: block;
			min-height: 48px;
			min-width: 288px;
			padding: 16px 24px;
			padding-right: 10px;
			box-sizing: border-box;
			box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);
			border-radius: 2px;
			font-size: 14px;
			cursor: default;
			background-color: ${changeOpacity(
				isDark(theme.background) ? '#afafaf' : '#323232', 90)};
			color: ${theme.textOnNonbackground};
		}

		:host(.show) #outerContainer {
			-webkit-transform: translateY(0);
			transform: translateY(0);
			opacity: 1;
		}

	</style>`
}, CHANGE_TYPE.THEME);
