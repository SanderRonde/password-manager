import { HorizontalCenterer } from "./horizontal-centerer";
import { TemplateFn, CHANGE_TYPE } from 'wclib';

export const HorizontalCentererHTML = new TemplateFn<HorizontalCenterer>((html, props) => {
	return html`
		<div id="container" class="${{
			fullscreen: props.fullscreen
		}}">
			<div id="content">
				<slot></slot>
			</div>
		</div>`
}, CHANGE_TYPE.PROP);