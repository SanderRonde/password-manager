import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { SizingBlock } from './sizing-block';
import { html } from 'lit-html';

export const SizingBlockHTML = new TemplateFn<SizingBlock>((_props) => {
	return html`
		<div></div>
	`
}, CHANGE_TYPE.PROP);
