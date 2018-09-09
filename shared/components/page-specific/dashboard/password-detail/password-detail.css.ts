import { PasswordDetail, NONE_SELECTED_VIEW_HEIGHT } from './password-detail';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { changeOpacity } from '../../../../lib/webcomponent-util';
import { html } from 'lit-html';

export const VIEW_FADE_TIME = 300;
export const PasswordDetailCSS = new TemplateFn<PasswordDetail>((_props, theme) => {
	return html`<style>
		#noneSelectedView {
			height: ${NONE_SELECTED_VIEW_HEIGHT}px;
		}

		#noneSelectedLock {
			fill: ${changeOpacity(theme.textOnBackground, 25)};
		}

		#noneSelectedText {
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

		.view.displayed {
			display: block;
		}

		.view.visible {
			opacity: 1;
		}
	</style>`
}, CHANGE_TYPE.ALWAYS);
