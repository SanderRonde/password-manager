/// <reference path="../../../../types/elements.d.ts" />

import { ConfigurableWebComponent, CHANGE_TYPE, config, Props, PROP_TYPE, ComplexType, bindToClass, isNewElement } from 'wclib';
import { MetaPasswords, MetaPasswordsPreviewData } from '../../../entrypoints/base/dashboard/dashboard';
import { PasswordPreviewIDMap, PasswordPreviewClassMap } from './password-preview-querymap';
import { InfiniteList, ListRendered } from '../../../util/infinite-list/infinite-list';
import { rippleEffect, RippleEffect } from '../../../../mixins/ripple';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { PasswordPreviewHTML } from './password-preview.html';
import { PasswordPreviewCSS } from './password-preview.css';
import { MDCard } from '../../../util/md-card/md-card';

export interface PasswordPreviewHost {
	props: {
		selected: number|undefined;
	};
	list: InfiniteList<MetaPasswords[0], MetaPasswordsPreviewData, 
		PasswordPreviewHost>;
}

@config({
	is: 'password-preview',
	css: PasswordPreviewCSS,
	html: PasswordPreviewHTML,
	dependencies: [
		MDCard
	]
})
@rippleEffect
export class PasswordPreview extends ConfigurableWebComponent<{
	IDS: PasswordPreviewIDMap;
	CLASSES: PasswordPreviewClassMap;
}> implements ListRendered {
	props = Props.define(this, {
		reflect: {
			id: PROP_TYPE.STRING,
			websites: {
				type: ComplexType<{
					host: string;
					exact: string;
					favicon: string|null;	
				}[]>()
			},
			username: PROP_TYPE.STRING,
			twofactor_enabled: PROP_TYPE.BOOL,
			selected: {
				type: PROP_TYPE.BOOL,
				value: false,
				strict: true
			},
			ref: {
				type: ComplexType<InfiniteList<MetaPasswords[0], MetaPasswordsPreviewData, 
					PasswordPreviewHost>|void>()
			},
			index: PROP_TYPE.NUMBER
		}
	});

	private rippleElement: HTMLElement|null = null;
	protected get container() {
		return this.$.content;
	}

	public select() {
		if (this.props.selected) return;

		this.props.selected = true;
	}

	public deselect() {
		if (!this.props.selected) return;

		this.props.selected = false;
	}

	@bindToClass
	public containerClick() {
		const isSelected = !this.props.selected;
		const list = this.props.ref;

		if (!list || (list.props.disabled && 
			!list.onDisabledClick(this.props.index).filter(val => val).length)) {
				PaperToast.createHidable(
					'Please click "cancel" or "save" to finish creating a password');
				return;
			}

		//Deselect all other items data-wise
		list.mapData((data) => {
			if (data !== null) {
				data.selected = false;
			}
			return data;
		});

		//Deselect all other items
		list.rendered.forEach((renderedItem: PasswordPreview) => {
			renderedItem.deselect && renderedItem.deselect();
		});

		//Update list data
		list.updateItemData(this.props.index, {
			selected: isSelected
		});

		if (isSelected) {
			this.select();
		} else {
			this.deselect();
		}

		//Signal to dashboard that the selected item changed
		list.props.ref.props.selected = isSelected ?
			this.props.index : -1;

		//Rerender card
		this.$.container.renderToDOM(CHANGE_TYPE.THEME);
	}

	listRender(_data: MetaPasswords[0], itemData: MetaPasswordsPreviewData|null) {
		this.classList.add('quicktransition');
		if (itemData && itemData.selected) {
			this.select();
		} else {
			this.deselect();
		}
		this.classList.remove('quicktransition');
	}

	postRender() {
		if (isNewElement(this.$.container)) {
			(() => {
				var rippleContainer = document.createElement('span');
				rippleContainer.classList.add('mdl-button__ripple-container');
				if (this.rippleElement) {
					this.rippleElement.remove();
				}
				this.rippleElement = document.createElement('span');
				this.rippleElement.classList.add('mdl-ripple');
				rippleContainer.appendChild(this.rippleElement);
				this.$.content.appendChild(rippleContainer);

				(<any>this as RippleEffect).applyRipple();
			})();
		}
	}
}