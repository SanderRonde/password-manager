import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { PasswordCreate } from './password-create';

export const PasswordCreateHTML = new TemplateFn<PasswordCreate>((html) => {
	return html`
		<div></div>
	`
}, CHANGE_TYPE.PROP);
