import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { SizingBlock } from './sizing-block';
import { html } from 'lit-html';

export const SizingBlockCSS = new TemplateFn<SizingBlock>((_props) => {
		return html`<style>
			
		</style>`
	}, CHANGE_TYPE.PROP);
