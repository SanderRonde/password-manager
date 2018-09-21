import { classNames, inlineListener } from "../../../lib/webcomponent-util";
import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { MaterialInput } from "./material-input";
import { html } from "lit-html";

export const MaterialInputHTML = new TemplateFn<MaterialInput>(function (props) {
	return html`
		<div id="container" class="${classNames(
			'mdl-textfield', 'mdl-js-textfield', {
				'mdl-textfield--floating-label': !props.noFloatingLabel,
				'fill': props.fill,
				'is-disabled': props.disabled
			}
		)}">
			<div id="mainInputContainer">
				<slot class="iconSlot" name="preIcon"></slot>
				<input class="mdl-textfield__input" type="${props.type}" 
					id="input" value="${props.value}" 
					pattern="${props.pattern}"
					on-keydown="${inlineListener(this.inputKeyDown, this)}"
					on-input="${inlineListener(this.updateClasses, this)}"
					on-focus="${inlineListener(this.onFocus, this)}"
					on-blur="${inlineListener(this.onBlur, this)}"
					on-reset="${inlineListener(this.onReset, this)}"
					aria-labelledby="label">
				<slot class="iconSlot" name="postIcon"></slot>
			</div>
			<label id="label" class="mdl-textfield__label">${props.label}</label>
			<span class="mdl-textfield__error">${props.error}</span>
		</div>`;
}, CHANGE_TYPE.PROP);