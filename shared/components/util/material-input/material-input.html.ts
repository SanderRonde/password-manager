import { genTemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { classNames } from "../../../lib/webcomponent-util";
import { MaterialInput } from "./material-input";
import { html } from "lit-html";

export const MaterialInputHTML = genTemplateFn<MaterialInput>((props) => {
	return html`
		<div id="container" class="${classNames(
			'mdl-textfield', 'mdl-js-textfield', {
				'mdl-textfield--floating-label': !props.noFloatingLabel,
				'fill': props.fill
			}
		)}">
			<div id="mainInputContainer">
				<slot class="iconSlot" name="preIcon"></slot>
				<input class="mdl-textfield__input" type="${props.type}" 
					id="input" value="${props.value}" 
					pattern="${props.pattern}"
					aria-labelledby="label">
				<slot class="iconSlot" name="postIcon"></slot>
			</div>
			<label id="label" class="mdl-textfield__label">${props.label}</label>
			<span class="mdl-textfield__error">${props.error}</span>
		</div>`;
}, CHANGE_TYPE.PROP);