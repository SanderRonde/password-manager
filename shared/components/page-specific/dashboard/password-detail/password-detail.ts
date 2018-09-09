/// <reference path="../../../../types/elements.d.ts" />

import { config, defineProps, ComplexType, wait } from '../../../../lib/webcomponent-util';
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { MetaPasswords } from '../../../entrypoints/base/dashboard/dashboard';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { SizingBlock } from '../../../util/sizing-block/sizing-block';
import { PasswordDetailIDMap } from './password-detail-querymap';
import { PasswordDetailHTML } from './password-detail.html';
import { PasswordDetailCSS, VIEW_FADE_TIME } from './password-detail.css';

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
			selected: ComplexType<MetaPasswords[0]>(),
			authData: ComplexType<PasswordDetailData>()
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

	private _getSelectedViewSize(password: MetaPasswords[0]) {
		return 500 + (password.websites.length * 200);
	}

	private _hideAll() {
		this.$$('.view').forEach((view) => {
			view.classList.remove('visible');
		});
		return wait(VIEW_FADE_TIME);
	}

	private _cancelCurrentAnimation: null|(() => void) = null;
	private async _animateView(view: keyof PasswordDetailIDMap, newSize: number) {
		let stop: boolean = false;

		this._cancelCurrentAnimation = () => {
			stop = true;
		};
		await this._hideAll();
		if (stop) return;
		await this.$.sizer.setSize(newSize);
		if (stop) return;
		this.$[view].classList.add('visible');
		await wait(VIEW_FADE_TIME);
		this._cancelCurrentAnimation = null;
	}

	private async _selectedChange(oldValue: MetaPasswords[0]|null, newValue: MetaPasswords[0]|null) {
		if (oldValue && newValue && oldValue.id === newValue.id) {
			//Just a list update, nothing to change
			return;
		}

		if (this._cancelCurrentAnimation) {
			this._cancelCurrentAnimation();
		}

		if (oldValue === null && newValue !== null) {
			await this._animateView('selectedView', this._getSelectedViewSize(newValue));
		} else if (oldValue !== null && newValue === null) {
			await this._animateView('noneSelectedView', NONE_SELECTED_VIEW_HEIGHT);
		}
	}
}