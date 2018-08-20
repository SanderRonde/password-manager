import { GlobalController } from './global-controller';
import { html } from 'lit-html';

export function GlobalControllerHTML(this: GlobalController, _props: GlobalController['props']) {
	return html`
		<!-- no css -->
		<div>
			<slot id="content"></slot>
		</div>`;
}