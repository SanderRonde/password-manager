import { CHANGE_TYPE, TemplateFn } from '../../../../lib/webcomponents';
import { changeOpacity } from '../../../../lib/webcomponent-util';
import { PasswordPreview } from './password-preview';
import { html } from 'lit-html';

export const PasswordPreviewCSS = new TemplateFn<PasswordPreview>((_props, theme) => {
	return html`<style>
		#container {
			margin-bottom: 20px;
			cursor: pointer;
		}

		#content {
			display: -webkit-flex;
			display: flex;
			flex-direction: row;
			-webkit-justify-content: space-between;
			justify-content: space-between;
			width: 480px;
			padding: 5px 0;
		}

		#pointer {
			margin-right: 25px;
			display: -webkit-flex;
			display: flex;
			flex-direction: row;
			-webkit-justify-content: flex-end;
			justify-content: flex-end;
		}

		#arrow, #twofactorEnabled {
			display: -webkit-flex;
			display: flex;
			flex-direction: column;
			-webkit-justify-content: center;
			justify-content: center;
		}

		.noIcon {
			fill: ${changeOpacity(theme.textOnBackground, 70)};
		}

		#pointer .__hollow_arrow {
			border-color: ${changeOpacity(theme.textOnBackground, 70)};
		}

		#websites {
			flex-grow: 100;
			display: -webkit-flex;
			display: flex;
			flex-direction: column;
			color: ${theme.textOnBackground};
		}

		.website {
			display: -webkit-flex;
			display: flex;
			flex-direction: row;
			padding: 10px 15px;
			height: 70px;
		}

		.username {
			color: ${changeOpacity(theme.textOnBackground, 85)};
		}

		.urls {
			flex-grow: 100;
			display: block;
			margin-top: 10px;
			margin-left: 10px;
		}

		.url {
			font-weight: 500;
			font-size: 150%;
		}
	</style>`
}, CHANGE_TYPE.THEME);