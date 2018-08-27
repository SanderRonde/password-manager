import { MDCard } from './md-card';
import { html } from 'lit-html';

export function MDCardHTML(this: MDCard) {
	return html`
		${this.css}
		<div id="shadow">
			<slot></slot>
		</div>
	`;
}