import { ERRS, Hashed, Padded, MasterPasswordDecryptionpadding } from '../../../../types/crypto';
import { GlobalControllerData, GlobalController } from '../../base/global/global-controller';
import { decryptWithPrivateKey, hash, pad } from '../../../../lib/browser-crypto';
import { Dashboard, DashboardDependencies } from '../../base/dashboard/dashboard';
import { ENTRYPOINT, GlobalProperties } from '../../../../types/shared-types';
import { createClientAPIRequest } from '../../../../lib/apirequests';
import { DashboardHTML } from '../../base/dashboard/dashboard.html';
import { CHANGE_TYPE, config } from '../../../../lib/webcomponents';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { DashboardCSS } from '../../base/dashboard/dashboard.css';
import { MasterPassword } from '../../../../types/db-types';
import { Remove } from '../../../../types/serviceworker';

@config({
	is: 'dashboard-page',
	css: DashboardCSS,
	html: DashboardHTML,
	dependencies: [...DashboardDependencies, PaperToast]
})
export class DashboardWeb extends Dashboard { 
	private _data!: Remove<GlobalControllerData['loginData'], 'password' & {
		decrypt_hash: Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>;	
	}>;

	public get loginData() {
		if (this._data) {
			return {
				instance_id: this._data.instance_id,
				server_public_key: this._data.server_public_key,
				auth_token: this._data.login_auth
			};
		}
		return {
			instance_id: '' as any,
			server_public_key: '' as any,
			auth_token: '' as any
		}
	}

	private _failNoCredentials(message: string) {
		PaperToast.createHidable(message + ', redirecting to login page...',
			PaperToast.DURATION.LONG);
		if (!document.body.classList.contains('dev')) {
			this.getRoot<GlobalController>().changePage(ENTRYPOINT.LOGIN);
		}
	}	

	private _initData() {
		const data = this.getRoot<GlobalController>().getData('loginData');
		if (!data) {
			return null;
		}
		
		const decryptHashed = hash(pad(data.password, 'masterpwdecrypt'));
		const verifyHashed = hash(pad(data.password, 'masterpwverify'));
		return {
			verifyHashed,
			newData: {...data, ...{
				password: undefined,
				decrypt_hash: decryptHashed
			}}
		}
	}

	protected async _getPasswordMeta() {
		const data = this._initData();
		if (!data) {
			//No global data, redirect to login
			this._failNoCredentials('No credentials');
			return null;
		}
		const { newData, verifyHashed } = data;
		this._data = newData as any;
		this.getRoot<GlobalController>().storeData('decryptHash', {
			hash: newData.decrypt_hash
		});

		this.renderToDOM(CHANGE_TYPE.PROP);

		if (this.globalProps<GlobalProperties>().get('password_meta')) {
			const decrypted = decryptWithPrivateKey(
				this.globalProps<GlobalProperties>().get('password_meta')!,
				this._data.private_key);
			if (decrypted === ERRS.INVALID_DECRYPT) {
				this._failNoCredentials('Failed to decrypt data');
				return null;
			}
			try {
				return JSON.parse(decrypted);
			} catch(e) {
				this._failNoCredentials(`Failed to parse data`);
				return null;
			}
		}

		const request = createClientAPIRequest({
			publicKey: this._data.server_public_key
		}, '/api/password/allmeta', {
			instance_id: this._data.instance_id
		}, {
			count: this.getRoot<GlobalController>().getRequestCount(),
			token: this.getRoot<GlobalController>().getAPIToken(),
			password_hash: verifyHashed
		});
		const res = await request.fn();
		if (res.success === false) {
			this._failNoCredentials(`Failed to get passwords "${res.ERR}"`);
			return null;
		}

		const decrypted = decryptWithPrivateKey(
			res.data.encrypted,
			this._data.private_key);
		if (decrypted === ERRS.INVALID_DECRYPT) {
			this._failNoCredentials('Failed to decrypt data');
			return null;
		}
		try {
			return JSON.parse(decrypted);
		} catch(e) {
			this._failNoCredentials(`Failed to parse data`);
			return null;
		}
	}

	mounted() {
		super.mounted();
	}
}