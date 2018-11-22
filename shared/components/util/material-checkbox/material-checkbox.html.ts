import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { MaterialCheckbox } from './material-checkbox';

export const MaterialCheckboxHTML = new TemplateFn<MaterialCheckbox>(function (html, props) {
	return html`
		<div class="mdc-form-field">
			<div class="mdc-checkbox">
				<input type="checkbox"
					?disabled="${props.disabled}"
					class="mdc-checkbox__native-control"
					id="checkbox"/>
				<div class="mdc-checkbox__background">
					<svg class="mdc-checkbox__checkmark"
						viewBox="0 0 24 24">
						<path class="mdc-checkbox__checkmark-path"
							fill="none"
							d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
					</svg>
					<div class="mdc-checkbox__mixedmark"></div>
				</div>
			</div>
			<div class="label">
				<label for="checkbox">
					<slot></slot>
				</label>
			</div>
		</div>
	`
}, CHANGE_TYPE.PROP);