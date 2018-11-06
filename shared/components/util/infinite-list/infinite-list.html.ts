import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { InfiniteList } from './infinite-list';

export const InfiniteListHTML = new TemplateFn<InfiniteList<any, any, any>>(function (html) {
	return html`
		<slot name="template" id="template" class="hidden"></slot>
		<div id="sizeGetter" class="hidden"></div>
		<div id="focusCapturer" tabIndex="-1"
			@keydown="${this.focusCapturerKeydown}"
		></div>
		<div id="contentContainer"
			@keypress="${this.contentContainerKeyPress}"
		>
			<div id="physicalContent"></div>
		</div>
	`;
}, CHANGE_TYPE.NEVER);