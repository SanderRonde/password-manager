import { TemplateFn, CHANGE_TYPE } from 'wclib';
import { SizingBlock } from './sizing-block';

export const SizingBlockHTML = new TemplateFn<SizingBlock>(function (html) {
	return html`
		${this.getMaxHeightCSS()}
		<div id="sizer">
			<div id="content">
				<slot></slot>
			</div>
		</div>
	`
}, CHANGE_TYPE.PROP);
