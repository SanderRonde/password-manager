import { GlobalController } from './global-controller';
import { html } from 'lit-html';

export function GlobalControllerHTML(this: GlobalController, _props: GlobalController['props']) {
	return html`
		${this.css}
		<div id="container">
			<div id="spinnerContainer">
				<horizontal-centerer>
					<vertical-centerer fullscreen>
						<loading-spinner big id="spinner"></loading-spinner>
					</vertical-centerer>
				</horizontal-centerer>
			</div>
			<div id="visibleContent">
				<slot id="slotContent"></slot>
				<div id="content"></div>
			</div>
		</div>`;
}