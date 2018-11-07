import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { MaterialInput } from "./material-input";

export const MaterialInputHTML = new TemplateFn<MaterialInput>(function (html, props) {
	return html`
		<div id="container" class="${['mdl-textfield', 'mdl-js-textfield', {
				'mdl-textfield--floating-label': !props.noFloatingLabel,
				'fill': props.fill,
				'is-disabled': props.disabled,
				'is-dirty': props.readonly || props.disabled || props.value
			}
		]}">
			<div id="mainInputContainer">
				<slot class="iconSlot" name="preIcon"></slot>
				${props.multiline ? 
					html`
						<textarea class="mdl-textfield__input" type="${props.type}" 
							id="input" rows="${props.rows}"
							pattern="${props.pattern || '.*'}"
							?readonly="${props.readonly}"
							autocomplete="${props.autocomplete ? 'on' : 'off'}"
							@keydown="${this.inputKeyDown}"
							@input="${this.updateClasses}"
							@focus="${this.onFocus}"
							@blur="${this.onBlur}"
							@reset="${this.onReset}"
							aria-labelledby="label">${props.value}</textarea>
					` : html`
						<input class="mdl-textfield__input" type="${props.type}" 
							id="input" value="${props.value}" 
							pattern="${props.pattern || '.*'}"
							?readonly="${props.readonly}"
							autocomplete="${props.autocomplete ? 'on' : 'off'}"
							@keydown="${this.inputKeyDown}"
							@input="${this.updateClasses}"
							@focus="${this.onFocus}"
							@blur="${this.onBlur}"
							@reset="${this.onReset}"
							aria-labelledby="label">
					`}
				<slot class="iconSlot" name="postIcon"></slot>
			</div>
			<label id="label" class="mdl-textfield__label">${props.label}</label>
			<span class="mdl-textfield__error">${props.error}</span>
		</div>`;
}, CHANGE_TYPE.PROP);