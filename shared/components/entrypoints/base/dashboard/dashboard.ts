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

export abstract class Dashboard extends DashboardScrollManager { 
	props = defineProps(this, {
		priv: {
			metaPasswords: {
				type: ComplexType<MetaPasswords>(),
				defaultValue: [],
				isPrivate: true
			}
		}
	});

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