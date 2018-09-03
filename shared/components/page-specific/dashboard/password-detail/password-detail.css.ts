import { PasswordDetail, NONE_SELECTED_VIEW_HEIGHT } from './password-detail';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { html } from 'lit-html';
import { changeOpacity } from '../../../../lib/webcomponent-util';

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
	</style>`
}, CHANGE_TYPE.ALWAYS);
