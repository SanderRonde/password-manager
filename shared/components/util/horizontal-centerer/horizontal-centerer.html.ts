import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { HorizontalCenterer } from "./horizontal-centerer";

export const HorizontalCentererHTML = new TemplateFn<HorizontalCenterer>((html) => {
	return html`
		<div id="container">
			<div id="content">
				<slot></slot>
			</div>
		</div>`
}, CHANGE_TYPE.NEVER);