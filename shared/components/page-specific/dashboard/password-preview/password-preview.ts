/// <reference path="../../../../types/elements.d.ts" />

import { MetaPasswords, MetaPasswordsPreviewData } from '../../../entrypoints/base/dashboard/dashboard';
import { config, defineProps, PROP_TYPE, ComplexType, listenIfNew } from '../../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { InfiniteList } from '../../../util/infinite-list/infinite-list';
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
			selected: {
				type: PROP_TYPE.BOOL,
				value: false
			},
			ref: {
				type: ComplexType<InfiniteList<MetaPasswords[0], MetaPasswordsPreviewData, 
					PasswordPreviewHost>>()
			},
			index: PROP_TYPE.NUMBER
		}
	});

	postRender() {
		listenIfNew(this, 'container', 'click', () => {
			const isSelected = !this.props.selected;
			this.props.selected = isSelected;

			const list = this.props.ref;

			//Deselect all other items
			list.mapData((data) => {
				if (data !== null) {
					data.selected = false;
				}
				return data;
			});

			//Update list data
			list.updateItemData(this.props.index, {
				selected: isSelected
			});

			//Signal to dashboard that the selected item changed
			this.props.ref.props.ref.props.selected = isSelected ?
				this.props.index : -1;
		});
	}
}