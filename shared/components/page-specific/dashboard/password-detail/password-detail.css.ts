import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { changeOpacity } from '../../../../lib/webcomponent-util';
import { PasswordDetail } from './password-detail';
import { html } from 'lit-html';

export const VIEW_FADE_TIME = 300;
export const STATIC_VIEW_HEIGHT = Math.min(window.innerHeight, 580);
export const PasswordDetailCSS = new TemplateFn<PasswordDetail>((_props, theme) => {
	return html`<style>
		#noneSelectedView, #twofactorRequiredView, #u2fRequiredView, #failedView, #loadingView {
			height: ${STATIC_VIEW_HEIGHT}px;
		}

		.staticIcon {
			fill: ${changeOpacity(theme.textOnBackground, 70)};
		}

		#failedView .staticIcon {
			fill: ${theme.error};
		}

		.lowerOpacityIcon {
			fill: ${changeOpacity(theme.textOnBackground, 25)};
		}

		.viewIconText {
			font-size: 150%;
			font-weight: 500;
			text-align: center;
			color: ${changeOpacity(theme.textOnBackground, 60)};
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

		#selectedView {
			padding: 30px;
		}

		.passwordWebsite {
			padding: 10px;
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			border-radius: 5px;
			margin-bottom: 10px;
			background-color: ${changeOpacity(theme.accent.main, 5)};
			border: 1px solid ${theme.accent.main};
		}

		.passwordWebsiteRemoveCenterer {
			display: flex;
			flex-direction: column;
			justify-content: center;
			margin-left: 20px;
		}

		#addWebsiteCenterer {
			display: flex;
			flex-direction: row;
			justify-content: flex-end;
			margin-top: 10px;
		}

		#passwordSettingsLayout {
			display: flex;
			flex-direction: row;
			justify-content: space-around;
		}

		#passwordButtons {
			display: flex;
			flex-direction: row;
			justify-content: flex-end;
			margin-top: 40px;
		}

		#saveChanges {
			margin-left: 10px;
		}

		material-input .copy {
			display: inline-block;
		}

		material-input .copyDone {
			display: none;
		}

		material-input.done .copy {
			display: none;
		}

		material-input.done .copyDone {
			display: inline-block;
		}
	</style>`
}, CHANGE_TYPE.ALWAYS);
