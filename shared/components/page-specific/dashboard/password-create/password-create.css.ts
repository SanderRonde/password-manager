import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { PasswordCreate } from './password-create';
import { PasswordFormCSS } from '../password-form/password-form.css';

export const PasswordCreateCSS = new TemplateFn<PasswordCreate>(function (html) {
		return html`<style>
			${PasswordFormCSS.renderTemplate(CHANGE_TYPE.THEME, this as any)}
		</style>`
	}, CHANGE_TYPE.PROP);
