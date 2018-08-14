import { PaperButton } from "./paper-button";
import { html } from "lit-html";
import { classNames } from '../../../lib/webcomponent-util';

export function PaperButtonHTML(this: PaperButton) {
	return html`
		${this.css}
		${this.customCSS}
		<button id="button" class="${classNames(
			'mdl-button', 'mdl-js-button', {
				'mdl-button--raised': !this.props.flat,
				'mdl-js-ripple-effect': !this.props.noRipple
			 })}">
			<slot></slot>
			<span>${this.props.content}</span>
		</button>`;
}