/// <reference path="../../../../types/elements.d.ts" />

import { config, defineProps, PROP_TYPE, ComplexType, isNewElement, listen } from '../../../../lib/webcomponent-util';
import { MetaPasswords, MetaPasswordsPreviewData } from '../../../entrypoints/base/dashboard/dashboard';
import { ConfigurableWebComponent, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { InfiniteList } from '../../../util/infinite-list/infinite-list';
import { rippleEffect, RippleEffect } from '../../../../mixins/ripple';
import { PasswordPreviewIDMap } from './password-preview-querymap';
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
export class PasswordPreview extends ConfigurableWebComponent<PasswordPreviewIDMap> {
	props = defineProps(this, {
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
			u2f_enabled: PROP_TYPE.BOOL,
			selected: {
				type: PROP_TYPE.BOOL,
				value: false,
				strict: true
			},
			ref: {
				type: ComplexType<InfiniteList<MetaPasswords[0], MetaPasswordsPreviewData, 
					PasswordPreviewHost>>()
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
		this.$.container.renderToDOM(CHANGE_TYPE.THEME);
	}

	public deselect() {
		if (!this.props.selected) return;

		this.props.selected = false;
		this.$.container.renderToDOM(CHANGE_TYPE.THEME);
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


			listen(this, 'container', 'click', () => {
				const isSelected = !this.props.selected;
				const list = this.props.ref;
	
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
	
				this.props.selected = isSelected;
	
				//Signal to dashboard that the selected item changed
				this.props.ref.props.ref.props.selected = isSelected ?
					this.props.index : -1;
	
				//Rerender card
				this.$.container.renderToDOM(CHANGE_TYPE.THEME);
			});
		}
	}
}