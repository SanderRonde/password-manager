import { InfiniteList } from './infinite-list';
import { html } from 'lit-html';
import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';

export const InfiniteListHTML = new TemplateFn<InfiniteList<any, any>>(() => {
	return html`
		<slot name="template" id="template" class="hidden"></slot>
		<div id="sizeGetter" class="hidden"></div>
		<div id="focusCapturer" tabIndex="-1"></div>
		<div id="contentContainer">
			<div id="physicalContent"></div>
		</div>
	`;
}, CHANGE_TYPE.NEVER);