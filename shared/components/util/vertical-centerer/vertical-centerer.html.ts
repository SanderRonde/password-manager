import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { VerticalCenterer } from "./vertical-centerer";

export const VerticalCentererHTML = new TemplateFn<VerticalCenterer>((html, props) => {
	return html`
		<div id="container" class="${{
			fullscreen: props.fullscreen
		}}">
			<div id="content">
				<slot></slot>
			</div>
		</div>`
}, CHANGE_TYPE.PROP);