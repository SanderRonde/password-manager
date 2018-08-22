import { InfiniteList } from './infinite-list';
import { html } from 'lit-html';

export function InfiniteListHTML<D>(this: InfiniteList<D>, props: InfiniteList<D>['props']) {
	return html`
		${this.css}
		<slot name="template" id="template"></slot>
		<div id="contentContainer">
			<div id="topFiller"></div>
			<div id="content">
				${props.data.map((data) => {
					return this.htmlTemplate(data);
				})}
			</div>
			<div id="bottomFiller"></div>
		</div>
	`;
}