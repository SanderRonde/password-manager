import { CHANGE_TYPE, TemplateFn } from '../../../../lib/webcomponents';
import { PasswordPreview } from './password-preview';
import { html } from 'lit-html';

export const PasswordPreviewCSS = new TemplateFn<PasswordPreview>(() => {
	return html`<style>

	</style>`
}, CHANGE_TYPE.PROP);