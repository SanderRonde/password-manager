import { CHANGE_TYPE, genTemplateFn } from '../../../lib/webcomponents';
import { GlobalController } from './global-controller';
import { html } from 'lit-html';

export const GlobalControllerHTML = genTemplateFn<GlobalController>(() => {
	return html`
		<loadable-block spinner-size="big" id="loadable">
			<div>
				<slot id="slotContent"></slot>
				<div id="content"></div>
			</div>
		</loadable-block>`;
}, CHANGE_TYPE.NEVER);