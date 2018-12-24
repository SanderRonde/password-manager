import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { PaperDialog } from './paper-dialog';
import { html } from 'lit-html';

export const ANIMATION_DURATION = 400;

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
			display: none;
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

			transform: scale(0);
			transition: transform ${ANIMATION_DURATION}ms cubic-bezier(0.55, 0.06, 0.68, 0.19);
		}

		#dialogSemantic[open] {
			display: block;
		}

		#dialogSemantic.animate {
			transform: scale(1);
		}

		#dialogContainer {
			pointer-events: all;
		}

		#dialogTitle {
			font-size: 200%;
			font-weight: bold;
			margin-bottom: 10px;
		}

		#dialogContent.fullscreen {
			width: 80vw;
			height: 80vh;
		}
	</style>`
}, CHANGE_TYPE.PROP);