import { CHANGE_TYPE, genTemplateFn } from '../../../lib/webcomponents';
import { LoadableBlock } from './loadable-block';
import { html } from "lit-html";

export const LoadableBlockHTML = genTemplateFn<LoadableBlock>(function() {
	const { big, medium, dimensions } = this.getSpinnerSizes();
	return html`
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
}, CHANGE_TYPE.PROP);