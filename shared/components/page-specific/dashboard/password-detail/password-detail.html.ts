import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { PasswordDetail } from './password-detail';
import { html } from 'lit-html';

export const PasswordDetailHTML = new TemplateFn<PasswordDetail>((_props) => {
	return html`
		<div>
			<md-card id="passwordFocus" level="3">
				Select something
			</md-card>
		</div>
	`
}, CHANGE_TYPE.PROP);
