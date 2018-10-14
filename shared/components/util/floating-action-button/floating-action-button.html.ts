import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { FloatingActionButton } from './floating-action-button';
import { html } from 'lit-html';

export const FloatingActionButtonHTML = new TemplateFn<FloatingActionButton>(function (_props) {
	return html`
		<div id="container">
			<div id="circle">
				<div id="content">
					<slot></slot>
				</div>
			</div>
		</div>
	`
}, CHANGE_TYPE.PROP);
