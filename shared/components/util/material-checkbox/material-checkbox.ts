/// <reference path="../../../types/elements.d.ts" />

import { config, defineProps, PROP_TYPE, listen, isNewElement } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { MaterialCheckboxIDMap } from './material-checkbox-querymap';
import { MaterialCheckboxHTML } from './material-checkbox.html';
import { MaterialCheckboxCSS } from './material-checkbox.css';
import { bindToClass } from '../../../lib/decorators';

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
				value: false,
				reflectToSelf: false
			}
		}
	});

	@bindToClass
	public onChanged() {
		this.props.checked = this.checked;
		this.fire('change', this.checked, !this.checked);
	}

	get checked() {
		return this.$.checkbox.checked;
	}

	set(checked: boolean) {
		this.props.checked = checked;
	}

	postRender() {
		this.$.checkbox.checked = this.props.checked || false;
	}

	mounted() {
		if (isNewElement(this.$.checkbox)) {
			listen(this, 'checkbox', 'change', () => {
				this.onChanged();
			});
		}
	}
}