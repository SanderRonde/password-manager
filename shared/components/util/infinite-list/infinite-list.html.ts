import { InfiniteList } from './infinite-list';
import { html } from 'lit-html';

export function InfiniteListHTML<D, ID>(this: InfiniteList<D, ID>, _props: InfiniteList<D, ID>['props']) {
	return html`
		${this.css}
		<slot name="template" id="template" class="hidden"></slot>
		<div id="sizeGetter" class="hidden"></div>
		<div id="focusCapturer" tabIndex="-1"></div>
		<div id="contentContainer">
			<div id="physicalContent"></div>
		</div>
	`;
}