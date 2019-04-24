import { TemplateFn, CHANGE_TYPE } from 'wclib';
import { MoreInfo } from './more-info';

export const MoreInfoHTML = new TemplateFn<MoreInfo>((html, props) => {
	return html`
		<div id="hoverable">
			<div id="circle">
				<div id="letter">i</div>
			</div>
			<div id="info">${props.info}</div>
		</div>
	`
}, CHANGE_TYPE.PROP);
