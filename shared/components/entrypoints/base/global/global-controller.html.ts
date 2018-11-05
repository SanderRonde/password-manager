import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { GlobalController } from './global-controller';

export const GlobalControllerHTML = new TemplateFn<GlobalController>((html, _props, _theme) => {
	return html`
		<loadable-block spinner-size="big" id="loadable" click-through>
			<div>
				<slot id="slotContent"></slot>
				<div id="content"></div>
			</div>
		</loadable-block>`;
}, CHANGE_TYPE.NEVER);