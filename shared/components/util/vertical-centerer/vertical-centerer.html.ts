import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { classNames } from "../../../lib/webcomponent-util";
import { VerticalCenterer } from "./vertical-centerer";

export const VerticalCentererHTML = new TemplateFn<VerticalCenterer>((html, props) => {
	return html`
		<div id="container" class="${classNames({
			fullscreen: props.fullscreen
		})}">
			<div id="content">
				<slot></slot>
			</div>
		</div>`
}, CHANGE_TYPE.PROP);