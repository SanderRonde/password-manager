/// <reference path="../../../../types/elements.d.ts" />

import { config, defineProps, ComplexType } from '../../../../lib/webcomponent-util';
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { MetaPasswords } from '../../../entrypoints/base/dashboard/dashboard';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { SizingBlock } from '../../../util/sizing-block/sizing-block';
import { PasswordDetailIDMap } from './password-detail-querymap';
import { PasswordDetailHTML } from './password-detail.html';
import { PasswordDetailCSS } from './password-detail.css';

export const NONE_SELECTED_VIEW_HEIGHT = Math.min(window.innerHeight, 580);

@config({
	is: 'password-detail',
	css: PasswordDetailCSS,
	html: PasswordDetailHTML,
	dependencies: [
		SizingBlock,
		VerticalCenterer
	]
})
export class PasswordDetail extends ConfigurableWebComponent<PasswordDetailIDMap> {
	props = defineProps(this, {
		priv: {
			selected: ComplexType<MetaPasswords[0]>()
		}
	});

	constructor() {
		super();

		this.listen('propChange', (name, oldValue, newValue) => {
			if (name === 'selected') {
				this._selectedChange(oldValue, newValue);
			}
		});
	}

	private _selectedChange(oldValue: MetaPasswords[0]|null, newValue: MetaPasswords[0]|null) {
		if (oldValue && newValue && oldValue.id === newValue.id) {
			//Just a list update, nothing to change
			return;
		}

		
	}
}