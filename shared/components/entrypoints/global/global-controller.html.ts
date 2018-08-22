import { GlobalController } from './global-controller';
import { html } from 'lit-html';

export function GlobalControllerHTML(this: GlobalController, _props: GlobalController['props']) {
	return html`
		${this.css}
		<loadable-block spinner-size="big" id="loadable">
			<div>
				<slot id="slotContent"></slot>
				<div id="content"></div>
			</div>
		</loadable-block>`;
}