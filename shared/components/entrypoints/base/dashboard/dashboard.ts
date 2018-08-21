import { ConfigurableWebComponent } from "../../../../lib/webcomponents";
import { defineProps, JSONType } from '../../../../lib/webcomponent-util';
import { PublicKeyDecrypted } from '../../../../types/db-types';
import { APISuccessfulReturns } from '../../../../types/api';

export type MetaPasswords = PublicKeyDecrypted<APISuccessfulReturns['/api/password/allmeta']['encrypted']>;
export abstract class Dashboard extends ConfigurableWebComponent { 
	props = defineProps(this, {
		priv: {
			metaPasswords: {
				type: JSONType<MetaPasswords>(),
				value: []
			}
		}
	});

	protected abstract _getPasswordMeta(): Promise<MetaPasswords|null>|MetaPasswords|null;

	async mounted() {
		const pwMeta = await this._getPasswordMeta();
		if (!pwMeta) {
			//Redirecting to /login, just let this go
			return;
		}
		this.props.metaPasswords = pwMeta;
	}
}