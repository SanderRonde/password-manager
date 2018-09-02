import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { PasswordDetail } from './password-detail';
import { html } from 'lit-html';

export const PasswordDetailCSS = new TemplateFn<PasswordDetail>((_props) => {
		return html`<style>
			
		</style>`
	}, CHANGE_TYPE.PROP);
