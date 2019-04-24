import { TemplateFn, CHANGE_TYPE } from 'wclib';
import { PaperButton } from "./paper-button";

export const PaperButtonHTML = new TemplateFn<PaperButton>(function(html, props) {
	return html`
		${this.__customCSS}
		<button id="button" class="${[
			'mdl-button', 'mdl-js-button', {
				'mdl-button--raised': !props.flat,
				'mdl-js-ripple-effect': !props.noRipple
			}]}" label="${props.ariaLabel}"
			aria-label="${props.ariaLabel}"
			title="${props.ariaLabel}"
			@mouseup="${this.blurHandler}"
			@mouseleave="${this.blurHandler}"
			@click="${this.buttonClick}"
		>
			<slot></slot>
			${props.content ? html`<span>${props.content}</span>` : ''}
		</button>`;
}, CHANGE_TYPE.PROP);