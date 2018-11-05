import { inlineListener } from '../../../lib/webcomponents/template-util';
import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { InfiniteList } from './infinite-list';

export const InfiniteListHTML = new TemplateFn<InfiniteList<any, any, any>>(function (html) {
	return html`
		<slot name="template" id="template" class="hidden"></slot>
		<div id="sizeGetter" class="hidden"></div>
		<div id="focusCapturer" tabIndex="-1"
			on-keydown="${inlineListener(this.focusCapturerKeydown, this)}"
		></div>
		<div id="contentContainer"
			on-keypress="${inlineListener(this.contentContainerKeyPress, this)}"
		>
			<div id="physicalContent"></div>
		</div>
	`;
}, CHANGE_TYPE.NEVER);