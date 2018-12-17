import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { PaperDialog } from './paper-dialog';
import { html } from 'lit-html';

export const PaperDialogCSS = new TemplateFn<PaperDialog>((_props) => {
		return html`<style>
			
		</style>`
	}, CHANGE_TYPE.PROP);
