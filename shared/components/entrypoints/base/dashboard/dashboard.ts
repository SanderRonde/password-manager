import { PasswordPreview, PasswordPreviewHost } from '../../../page-specific/dashboard/password-preview/password-preview';
import { PasswordDetailWeb } from '../../../page-specific/dashboard/web/password-detail-web/password-detail-web';
import { WebComponentBase, Props, ComplexType, PROP_TYPE, CHANGE_TYPE } from "../../../../lib/webcomponents";
import { STATIC_VIEW_HEIGHT } from '../../../page-specific/dashboard/password-detail/password-detail.css';
import { PasswordDetailData } from '../../../page-specific/dashboard/password-detail/password-detail';
import { FloatingActionButton } from '../../../util/floating-action-button/floating-action-button';
import { PasswordCreate } from '../../../page-specific/dashboard/password-create/password-create';
import { HorizontalCenterer } from '../../../util/horizontal-centerer/horizontal-centerer';
import { MaterialInput } from '../../../util/material-input/material-input';
import { ThemeSelector } from '../../../util/theme-selector/theme-selector';
import { InfiniteList } from '../../../util/infinite-list/infinite-list';
import { DashboardScrollManager } from './dashboard-scroll-manager';
import { PublicKeyDecrypted } from '../../../../types/db-types';
import { APISuccessfulReturns } from '../../../../types/api';
import { wait } from '../../../../lib/webcomponent-util';
import { MDCard } from '../../../util/md-card/md-card';
import * as devPasswords from './dev-passwords';

export type MetaPasswords = PublicKeyDecrypted<APISuccessfulReturns['/api/password/allmeta']['encrypted']>;
export const DashboardDependencies: (typeof WebComponentBase)[] = [
	MaterialInput,
	InfiniteList,
	ThemeSelector,
	HorizontalCenterer,
	MDCard,
	PasswordPreview,
	PasswordDetailWeb,
	FloatingActionButton,
	PasswordCreate
]

export interface MetaPasswordsPreviewData {
	selected: boolean;
}

export abstract class Dashboard extends DashboardScrollManager implements PasswordPreviewHost { 
	props = Props.define(this, {
		priv: {
			metaPasswords: {
				type: ComplexType<MetaPasswords>(),
				defaultValue: null,
				isPrivate: true
			},
			selected: {
				type: PROP_TYPE.NUMBER,
				defaultValue: -1
			},
			newPassword: {
				type: ComplexType<MetaPasswords[0]|null>(),
				defaultValue: null,
				isPrivate: true
			}
		}
	});

	public abstract get loginData(): PasswordDetailData;
	
	public get selectedPassword() {
		if (typeof this.props.selected !== 'number' ||
			this.props.selected === -1 || 
			!this.props.metaPasswords || 
			this.props.metaPasswords.length === 0) {
				return null;
			}
		return this.props.metaPasswords[this.props.selected];
	}

	public get list() {
		return this.$.infiniteList as InfiniteList<MetaPasswords[0], 
			MetaPasswordsPreviewData, Dashboard>;
	}

	private _mountedCalled: boolean = false;

	constructor() {
		super();

		wait(2500).then(() => {
			if (this._mountedCalled) return;
			debugger;
			this.mounted();
		});
		this.listenProp<this['props'], 'metaPasswords'>('beforePropChange', (key, prevVal, newVal) => {
			if (key === 'metaPasswords' && this.props.selected !== -1 &&
				typeof this.props.selected === 'number') {
					//Check if the currently selected password is still in the new
					// batch. If so, switch the currentPassword index to that new password
					const currentPassword = prevVal[this.props.selected];
					const id = currentPassword.id;

					let newIndex: number = -1;
					//Find a password with that ID in the new value
					for (let i = 0; i < newVal.length; i++) {
						if (newVal[i].id === id) {
							newIndex = i;
							break;
						}
					}

					this.list.updateItemData(this.props.selected, {
						selected: false
					});

					//Set it to -1 before the update and change it afterwards
					this.props.selected = -1;
					window.setTimeout(() => {
						this.props.selected = newIndex;
						if (newIndex !== -1) {
							this.list.updateItemData(newIndex, {
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
		if (!pwMeta || (pwMeta.length === 0 && document.body.classList.contains('dev'))) {
			if (document.body.classList.contains('dev')) {
				this.props.metaPasswords = devPasswords.getDevPasswords();
			}
			//Redirecting to /login, just let this go
			return;
		}
		this.props.metaPasswords = pwMeta || [];
	}

	public fetchMeta() {
		this._getPwMeta();
	}

	public getItemSize(data: any, options: {
		isMin: true;
	}): number;
	public getItemSize(data: MetaPasswords[0], options: {
		isMin: false;
	}): number;
	public getItemSize(data: MetaPasswords[0]): number;
	public getItemSize(data: MetaPasswords[0], {
		isMin
	}: {
		isMin: boolean;
	} = {
		isMin: false
	}) {
		if (isMin) {
			return 10 + 90 + 20;
		}
		return 30 + (data.websites.length * 90);
	}

	public getPlaceholderList() {
		return new Array(Math.ceil(window.innerHeight / this.getItemSize(null, {
			isMin: true
		}))).fill('').map((_) => {});
	}

	public async addPassword() {
		this.props.newPassword = {
			id: '0' as any,
			twofactor_enabled: false,
			username: 'username',
			websites: [{
				exact: 'http://www.example.com',
				favicon: null,
				host: 'www.example.com'
			}]
		};
		this.$.infiniteList.props.disabled = true;
		await this.$.passwordFocus.animateView('loadingView', STATIC_VIEW_HEIGHT);
		this.$.passwordFocus.props.selected = this.props.newPassword;
		this.$.passwordFocus.animateView('newPasswordView', STATIC_VIEW_HEIGHT + 20);
	}

	public cancelNewPassword() {
		this.props.newPassword = null;
		this.$.infiniteList.props.disabled = false;
	}

	public updateAddedPassword<F extends keyof MetaPasswords[0]>(field: F, value: MetaPasswords[0][F]) {
		this.props.newPassword![field] = value;
		this.renderToDOM(CHANGE_TYPE.PROP);
	}

	private _onMount() {
		if (this._mountedCalled) return;
		this._mountedCalled = true;
		super.mounted();
		this._getPwMeta();
	}

	mounted() {
		this._onMount();
	}
}