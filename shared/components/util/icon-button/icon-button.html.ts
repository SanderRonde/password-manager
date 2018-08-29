import { genTemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { IconButton } from "./icon-button";
import { html } from "lit-html";

export const IconButtonHTML = genTemplateFn<IconButton>((props) => {
	return html`
		<button class="mdl-button mdl-js-button mdl-button--icon mdl-js-ripple-effect"
			aria-label="${props.ariaLabel}"
		>
			<slot></slot>
		</button>
	`
}, CHANGE_TYPE.PROP);