import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { classNames } from '../../../lib/webcomponent-util';
import { PaperButton } from "./paper-button";

export const PaperButtonHTML = new TemplateFn<PaperButton>(function(html, props) {
	return html`
		${this.__customCSS}
		<button id="button" class="${classNames(
			'mdl-button', 'mdl-js-button', {
				'mdl-button--raised': !props.flat,
				'mdl-js-ripple-effect': !props.noRipple
			})}" label="${props.ariaLabel}"
			aria-label="${props.ariaLabel}"
			title="${props.ariaLabel}"
			@mouseup="${this.blurHandler, this}"
			@mouseleave="${this.blurHandler, this}"
			@click="${this.buttonClick, this}"
		>
			<slot></slot>
			${props.content ? html`<span>${props.content}</span>` : ''}
		</button>`;
}, CHANGE_TYPE.PROP);