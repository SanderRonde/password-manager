import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { classNames, inlineListener } from '../../../lib/webcomponent-util';
import { PaperButton } from "./paper-button";
import { html } from "lit-html";

export const PaperButtonHTML = new TemplateFn<PaperButton>(function(props) {
	return html`
		${this.__customCSS}
		<button id="button" class="${classNames(
			'mdl-button', 'mdl-js-button', {
				'mdl-button--raised': !props.flat,
				'mdl-js-ripple-effect': !props.noRipple
			})}" label="${props.ariaLabel}"
			on-mouseup="${inlineListener(this.blurHandler, this, true)}"
			on-mouseleave="${inlineListener(this.blurHandler, this, true)}"
			on-click="${inlineListener(this.buttonClick, this, true)}"
		>
			<slot></slot>
			<span>${props.content}</span>
		</button>`;
}, CHANGE_TYPE.PROP);