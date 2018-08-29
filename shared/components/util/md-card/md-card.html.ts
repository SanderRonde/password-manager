import { genTemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { MDCard } from './md-card';
import { html } from 'lit-html';

export const MDCardHTML = genTemplateFn<MDCard>(() => {
	return html`
		<div id="shadow">
			<slot></slot>
		</div>
	`;
}, CHANGE_TYPE.NEVER);