import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { PaperDialog } from './paper-dialog';
import { html } from 'lit-html';

export const PaperDialogCSS = new TemplateFn<PaperDialog>((_props) => {
		return html`<style>
			#centerersContainer {
				position: fixed;
				top: 0;
				z-index: 100000;
				pointer-events: none;
			}

			/* TODO: show/hide */
		</style>`
	}, CHANGE_TYPE.PROP);
