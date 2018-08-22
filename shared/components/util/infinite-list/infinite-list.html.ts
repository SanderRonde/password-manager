import { InfiniteList } from './infinite-list';
import { html } from 'lit-html';

export function InfiniteListHTML(this: InfiniteList<any>, _props: InfiniteList<any>['props']) {
	return html`
		${this.css}
		<slot name="template" id="template"></slot>
		<div id="contentContainer">
			<div id="topFiller"></div>
			<div id="content"></div>
			<div id="bottomFiller"></div>
		</div>
	`;
}