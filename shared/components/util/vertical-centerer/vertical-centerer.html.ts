import { VerticalCentererCSS } from "./vertical-centerer.css";
import { classNames } from "../../../lib/webcomponent-util";
import { VerticalCenterer } from "./vertical-centerer";
import { html } from "lit-html";

export function VerticalCentererHTML(this: VerticalCenterer, props: VerticalCenterer['props']) {
	return html`
		${VerticalCentererCSS}
		<div id="container" class="${classNames({
			fullscreen: props.fullscreen
		})}">
			<div id="content">
				<slot></slot>
			</div>
		</div>`
}