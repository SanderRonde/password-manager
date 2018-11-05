import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { FloatingActionButton } from './floating-action-button';

export const FloatingActionButtonHTML = new TemplateFn<FloatingActionButton>(function (html) {
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
