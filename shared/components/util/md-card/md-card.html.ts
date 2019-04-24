import { TemplateFn, CHANGE_TYPE } from 'wclib';
import { MDCard } from './md-card';

export const MDCardHTML = new TemplateFn<MDCard>(function (html) {
	return html`
		<div id="shadow">
			<slot></slot>
		</div>
	`;
}, CHANGE_TYPE.NEVER);