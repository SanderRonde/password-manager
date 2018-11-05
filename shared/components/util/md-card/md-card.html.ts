import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { MDCard } from './md-card';

export const MDCardHTML = new TemplateFn<MDCard>((html) => {
	return html`
		<div id="shadow">
			<slot></slot>
		</div>
	`;
}, CHANGE_TYPE.NEVER);