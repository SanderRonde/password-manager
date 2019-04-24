import { GlobalController } from './global-controller';
import { TemplateFn, CHANGE_TYPE } from 'wclib';

export const GlobalControllerHTML = new TemplateFn<GlobalController>((html, _props, _theme) => {
	return html`
		<loadable-block spinner-size="big" id="loadable" click-through>
			<div>
				<div id="content"></div>
				<slot id="slotContent"></slot>
			</div>
		</loadable-block>`;
}, CHANGE_TYPE.NEVER);