import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { PasswordFormCSS } from '../password-form/password-form.css';
import { PasswordCreate } from './password-create';

export const PasswordCreateCSS = new TemplateFn<PasswordCreate>(function (html) {
		return html`<style>
			${PasswordFormCSS.renderSame(CHANGE_TYPE.THEME, this as any, html)}
		</style>`
	}, CHANGE_TYPE.PROP);
