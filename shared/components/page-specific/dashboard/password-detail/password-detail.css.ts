import { TemplateFn, CHANGE_TYPE, changeOpacity } from 'wclib';
import { ProjectTheme } from '../../../theming/theme/theme.es';
import { PasswordDetail } from './password-detail';

export const VIEW_FADE_TIME = 300;
export const STATIC_VIEW_HEIGHT = Math.min(window.innerHeight, 580);
export const PasswordDetailCSS = new TemplateFn<PasswordDetail, ProjectTheme>((html, _props, theme) => {
	return html`<style>
		#noneSelectedView, #twofactorRequiredView, #u2fRequiredView, #failedView, #loadingView {
			height: ${STATIC_VIEW_HEIGHT}px;
		}

		.staticIcon {
			fill: ${changeOpacity(theme.text, 70)};
		}

		#failedView .staticIcon {
			fill: ${theme.error};
		}

		.lowerOpacityIcon {
			fill: ${changeOpacity(theme.text, 25)};
		}

		.viewIconText {
			font-size: 150%;
			font-weight: 500;
			text-align: center;
			color: ${changeOpacity(theme.text, 60)};
		}

		.view {
			display: none;
			opacity: 0;
			transition: opacity ${VIEW_FADE_TIME}ms ease-in-out;
		}

		.view.quickAnimate {
			transition: opacity ${VIEW_FADE_TIME / 4}ms ease-in-out;
		}

		.view.displayed {
			display: block;
		}

		.view.visible {
			opacity: 1;
		}

		#u2fKeyIcon {
			margin-top: -100px;
		}

		#twofactorInput {
			display: flex;
			flex-direction: row;
			justify-content: center;
		}

		.twofactorDigit {
			border: 2px solid #666666;
			height: 30px;
			width: 30px;
			display: inline-block;
			border-radius: 5px;
			margin: 0 1px;
			font-size: 150%;
			text-align: center;
		}

		#selectedView, #newPasswordView {
			padding: 30px;
		}
	</style>`
}, CHANGE_TYPE.PROP | CHANGE_TYPE.THEME);
