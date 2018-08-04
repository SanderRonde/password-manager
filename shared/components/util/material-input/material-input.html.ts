import { classNames } from "../../../lib/webcomponent-util";
import { MaterialInput } from "./material-input";
import { html } from "lit-html";

export function MaterialInputHTML(this: MaterialInput) {
	return html`
		${this.css}
		<div id="container" class="${classNames(
			'mdl-textfield', 'mdl-js-textfield', {
				'mdl-textfield--floating-label': !this.props.noFloatingLabel,
				'fill': this.props.fill
			}
		)}">
			<div id="mainInputContainer">
				<slot class="iconSlot" name="preIcon"></slot>
				<input class="mdl-textfield__input" type="${this.props.type}" 
					id="input" value="${this.props.value}" 
					pattern="${this.props.pattern}">
				<slot class="iconSlot" name="postIcon"></slot>
			</div>
			<label id="label" class="mdl-textfield__label">${this.props.label}</label>
			<span class="mdl-textfield__error">${this.props.error}</span>
		</div>`;
}