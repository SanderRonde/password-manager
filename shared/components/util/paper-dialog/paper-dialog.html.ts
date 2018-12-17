import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { PaperDialog } from './paper-dialog';
import { html } from 'lit-html';

export const PaperDialogHTML = new TemplateFn<PaperDialog>((_props) => {
	return html`
		<div></div>
	`
}, CHANGE_TYPE.PROP);
