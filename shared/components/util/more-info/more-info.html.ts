import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { MoreInfo } from './more-info';
import { html } from 'lit-html';

export const MoreInfoHTML = new TemplateFn<MoreInfo>((props) => {
	return html`
		<div id="hoverable">
			<div id="circle">
				<div id="letter">i</div>
			</div>
			<div id="info">${props.info}</div>
		</div>
	`
}, CHANGE_TYPE.PROP);
