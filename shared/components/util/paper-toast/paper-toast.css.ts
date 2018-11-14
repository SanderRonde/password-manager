import { changeOpacity, isDark } from '../../../lib/webcomponents/template-util';
import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { ProjectTheme } from '../../theming/theme/theme';
import { PaperToast } from './paper-toast';

export const PaperToastCSS = new TemplateFn<PaperToast, ProjectTheme>((html, _props, theme) => {
	return html`<style>
		#toastContainer {
			display: block;
			position: fixed;
			min-height: 48px;
			min-width: 288px;
			padding: 16px 24px;
			padding-right: 10px;
			box-sizing: border-box;
			box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.26);
			border-radius: 2px;
			margin: 12px;
			font-size: 14px;
			cursor: default;
			-webkit-transition: -webkit-transform 0.3s, opacity 0.3s;
			transition: transform 0.3s, opacity 0.3s;
			opacity: 0;
			bottom: 0;
			-webkit-transform: translateY(100px);
			transform: translateY(100px);
			z-index: 10000;
			background-color: ${changeOpacity(
				isDark(theme.background) ? '#afafaf' : '#323232', 90)};
			color: ${theme.textOnNonbackground};
		}

		:host(.show) #toastContainer {
			-webkit-transform: translateY(0);
			transform: translateY(0);
			opacity: 1;
		}

		#toastText, #toastButtons {
			display: inline-block;
		}

		#toastContent {
			display: -webkit-flex;
			display: flex;
			flex-direction: row;
			-webkit-justify-content: space-between;
			justify-content: space-between;
		}

		#toastButtons {
			margin-top: -10px;
			margin-bottom: -10px;
			padding-left: 13px;
		}
	</style>`
}, CHANGE_TYPE.THEME);