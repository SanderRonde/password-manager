import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { html } from 'lit-html';

export const PasswordDetailHTML = new TemplateFn<PasswordDetail>((_props) => {
	return html`
		<div></div>
	`
}, CHANGE_TYPE.PROP);
