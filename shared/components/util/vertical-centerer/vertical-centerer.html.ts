import { genTemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { classNames } from "../../../lib/webcomponent-util";
import { VerticalCenterer } from "./vertical-centerer";
import { html } from "lit-html";

export const VerticalCentererHTML = genTemplateFn<VerticalCenterer>((props) => {
	return html`
		<div id="container" class="${classNames({
			fullscreen: props.fullscreen
		})}">
			<div id="content">
				<slot></slot>
			</div>
		</div>`
}, CHANGE_TYPE.PROP);