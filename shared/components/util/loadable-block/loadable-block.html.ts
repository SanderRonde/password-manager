import { LoadableBlock } from './loadable-block';
import { html } from "lit-html";

export function LoadableBlockHTML(this: LoadableBlock, _props: LoadableBlock['props']) {
	const { big, medium, dimensions } = this.getSpinnerSizes();
	return html`
		${this.css}
		<div id="spinnerContainer">
			<horizontal-centerer>
				<vertical-centerer fullscreen>
					<loading-spinner big="${big}" 
						medium="${medium}" dimensions="${dimensions}"
						id="spinner"
					></loading-spinner>
				</vertical-centerer>
			</horizontal-centerer>
		</div>
		<div id="visibleContent">
			<slot id="content"></slot>
		</div>
	`;
}