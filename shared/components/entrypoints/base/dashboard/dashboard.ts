import { PasswordPreview } from '../../../page-specific/dashboard/password-preview/password-preview';
import { HorizontalCenterer } from '../../../util/horizontal-centerer/horizontal-centerer';
import { ThemeSelector } from '../../../util/theme-selector/theme-selector';
import { MaterialInput } from '../../../util/material-input/material-input';
import { defineProps, ComplexType, PROP_TYPE } from '../../../../lib/webcomponent-util';
import { InfiniteList } from '../../../util/infinite-list/infinite-list';
import { DashboardScrollManager } from './dashboard-scroll-manager';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { WebComponentBase } from "../../../../lib/webcomponents";
import { PublicKeyDecrypted } from '../../../../types/db-types';
import { APISuccessfulReturns } from '../../../../types/api';
import { MDCard } from '../../../util/md-card/md-card';
import * as devPasswords from './dev-passwords';

export type MetaPasswords = PublicKeyDecrypted<APISuccessfulReturns['/api/password/allmeta']['encrypted']>;
export const DashboarDependencies: (typeof WebComponentBase)[] = [
	MaterialInput,
	PaperToast,
	InfiniteList,
	ThemeSelector,
	HorizontalCenterer,
	MDCard,
	PasswordPreview
]

export interface MetaPasswordsPreviewData {
	selected: boolean;
}

export abstract class Dashboard extends DashboardScrollManager { 
	props = defineProps(this, {
		priv: {
			metaPasswords: {
				type: ComplexType<MetaPasswords>(),
				defaultValue: [],
				isPrivate: true
			},
			currentPassword: {
				type: PROP_TYPE.NUMBER,
				defaultValue: -1
			}
		}
	});

	private get _list() {
		return this.$.infiniteList as InfiniteList<MetaPasswords[0], MetaPasswordsPreviewData>;
	}

	constructor() {
		super();

		this.listen('beforePropChange', (key, prevVal: MetaPasswords, newVal: MetaPasswords) => {
			if (key === 'metaPasswords' && this.props.currentPassword !== -1 &&
				typeof this.props.currentPassword === 'number') {
					//Check if the currently selected password is still in the new
					// batch. If so, switch the currentPassword index to that new password
					const currentPassword = prevVal[this.props.currentPassword];
					const id = currentPassword.id;

					let newIndex: number = -1;
					//Find a password with that ID in the new value
					for (let i = 0; i < newVal.length; i++) {
						if (newVal[i].id === id) {
							newIndex = i;
							break;
						}
					}

					this._list.updateItemData(this.props.currentPassword, {
						selected: false
					});

					//Set it to -1 before the update and change it afterwards
					this.props.currentPassword = -1;
					window.setTimeout(() => {
						this.props.currentPassword = newIndex;
						if (newIndex !== -1) {
							this._list.updateItemData(newIndex, {
								selected: true
							});
						}
					}, 0);
				}
		});
	}

	protected abstract _getPasswordMeta(): Promise<MetaPasswords|null>|MetaPasswords|null;

	private async _getPwMeta() {
		const pwMeta = await this._getPasswordMeta();
		if (!pwMeta) {
			if (document.body.classList.contains('dev')) {
				this.props.metaPasswords = devPasswords.getDevPasswords();
			}
			//Redirecting to /login, just let this go
			return;
		}
		this.props.metaPasswords = pwMeta || [];
	}

	public getItemSize(data: MetaPasswords[0], {
		isMin
	}: {
		isMin: boolean;
	}) {
		if (isMin) {
			return 10 + 90 + 20;
		}
		return 30 + (data.websites.length * 90);
	}

	mounted() {
		super.mounted();
		this._getPwMeta();
	}
}