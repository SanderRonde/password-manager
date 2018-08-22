import { InfiniteList } from './infinite-list';
import { html } from 'lit-html';

export function InfiniteListHTML(this: InfiniteList, _props: InfiniteList['props']) {
	return html`
		${this.css}
		<div></div>
	`;
}