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

			/** Reset default styles */
			#dialogSemantic {
				display: block;
				position: relative;
				left: auto;
				right: auto;
				width: auto;
				height: auto;
				color: inherit;
				margin: auto;
				border: none;
				padding: none;
				background: inherit;
			}

			#dialogContainer {
				pointer-events: all;
			}

			/* TODO: show/hide */
		</style>`
	}, CHANGE_TYPE.PROP);
