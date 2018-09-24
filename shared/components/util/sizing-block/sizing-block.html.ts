import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { SizingBlock } from './sizing-block';
import { html } from 'lit-html';

export const SizingBlockHTML = new TemplateFn<SizingBlock>(function () {
	return html`
		${this.getMaxHeightCSS()}
		<div id="sizer">
			<div id="content">
				<slot></slot>
			</div>
		</div>
	`
}, CHANGE_TYPE.PROP);
