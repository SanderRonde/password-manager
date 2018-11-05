import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { IconButton } from "./icon-button";

export const IconButtonHTML = new TemplateFn<IconButton>((html, props) => {
	return html`
		<button id="button" class="mdl-button mdl-js-button mdl-button--icon mdl-js-ripple-effect"
			aria-label="${props.ariaLabel}"
		>
			<slot></slot>
		</button>
	`
}, CHANGE_TYPE.PROP);