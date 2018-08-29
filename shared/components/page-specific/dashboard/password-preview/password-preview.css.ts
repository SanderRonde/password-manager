import { CHANGE_TYPE, genTemplateFn } from '../../../../lib/webcomponents';
import { PasswordPreview } from './password-preview';
import { html } from 'lit-html';

export const PasswordPreviewCSS = genTemplateFn<PasswordPreview>(() => {
	return html`<style>

	</style>`
}, CHANGE_TYPE.PROP);