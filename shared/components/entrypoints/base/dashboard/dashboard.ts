import { PasswordPreview } from '../../../page-specific/dashboard/password-preview/password-preview';
import { HorizontalCenterer } from '../../../util/horizontal-centerer/horizontal-centerer';
import { ThemeSelector } from '../../../util/theme-selector/theme-selector';
import { MaterialInput } from '../../../util/material-input/material-input';
import { defineProps, ComplexType } from '../../../../lib/webcomponent-util';
import { InfiniteList } from '../../../util/infinite-list/infinite-list';
import { DashboardScrollManager } from './dashboard-scroll-manager';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { WebComponentBase } from "../../../../lib/webcomponents";
import { PublicKeyDecrypted } from '../../../../types/db-types';
import { APISuccessfulReturns } from '../../../../types/api';
import { MDCard } from '../../../util/md-card/md-card';

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

export abstract class Dashboard extends DashboardScrollManager { 
	props = defineProps(this, {
		priv: {
			metaPasswords: {
				type: ComplexType<MetaPasswords>(),
				defaultValue: []
			}
		}
	});

	protected abstract _getPasswordMeta(): Promise<MetaPasswords|null>|MetaPasswords|null;

	private async _getPwMeta() {
		const pwMeta = await this._getPasswordMeta();
		if (!pwMeta) {
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
			return 78 + 57;
		}
		return 78 + (data.websites.length * 57);
	}

	mounted() {
		super.mounted();
		this._getPwMeta();
	}
}