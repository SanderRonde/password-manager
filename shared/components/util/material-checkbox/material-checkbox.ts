/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { MaterialCheckboxIDMap } from './material-checkbox-querymap';
import { MaterialCheckboxHTML } from './material-checkbox.html';
import { MaterialCheckboxCSS } from './material-checkbox.css';
import { config, defineProps, PROP_TYPE } from '../../../lib/webcomponent-util';

@config({
	is: 'material-checkbox',
	css: MaterialCheckboxCSS,
	html: MaterialCheckboxHTML
})
export class MaterialCheckbox extends ConfigurableWebComponent<MaterialCheckboxIDMap, {
	change: {
		args: [boolean, boolean]
	}
}> {
	props = defineProps(this, {
		reflect: {
			checked: {
				type: PROP_TYPE.BOOL,
				strict: true,
				value: false
			}
		}
	});

	public onChanged() {
		this.fire('change', this.isChecked, !this.isChecked);
	}

	get isChecked() {
		return this.$.checkbox.checked;
	}

	set(checked: boolean) {
		this.props.checked = checked;
		this.$.checkbox.checked = checked;
	}

	layoutMounted() {
		this.set(this.props.checked || false);
	}

	mounted() {
		this.set(this.props.checked || false);
	}
}