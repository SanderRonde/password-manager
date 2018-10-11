import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { FloatingActionButton } from './floating-action-button';
import { html } from 'lit-html';

export const FloatingActionButtonCSS = new TemplateFn<FloatingActionButton>((_props) => {
		return html`<style>
			
		</style>`
	}, CHANGE_TYPE.PROP);
