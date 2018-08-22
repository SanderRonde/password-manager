import { ERRS, Hashed, Padded, MasterPasswordDecryptionpadding } from '../../../../types/crypto';
import { decryptWithPrivateKey, hash, pad } from '../../../../lib/browser-crypto';
import { MaterialInput } from '../../../util/material-input/material-input';
import { GlobalControllerData } from '../../global/global-controller';
import { DashboardHTML } from '../../base/dashboard/dashboard.html';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { DashboardCSS } from '../../base/dashboard/dashboard.css';
import { doClientAPIRequest } from '../../../../lib/apirequests';
import { MasterPassword } from '../../../../types/db-types';
import { Dashboard } from '../../base/dashboard/dashboard';
import { config } from '../../../../lib/webcomponent-util';
import { Remove } from '../../../../types/serviceworker';

@config({
	is: 'dashboard-page',
	css: DashboardCSS,
	html: DashboardHTML,
	dependencies: [
		MaterialInput,
		PaperToast
	]
})
export class DashboardWeb extends Dashboard { 
	private _data!: Remove<GlobalControllerData['loginData'], 'password' & {
		decrypt_hash: Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>;	
	}>;
	private _count: number = 0;
	private _upCount() {
		const count = this._count;
		this._count = count + 1;
		return count;
	}

	private _failNoCredentials(message: string) {
		PaperToast.create({
			content: message + ', redirecting to login page...',
			buttons: [PaperToast.BUTTONS.HIDE],
			duration: 10000
		});
		this.getRoot().changePage('login');
	}	

	private _initData() {
		const data = this.getRoot().getData('loginData');
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

		if (this._globalProperties.password_meta) {
			const decrypted = decryptWithPrivateKey(
				this._globalProperties.password_meta,
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

		const res = await doClientAPIRequest({
			publicKey: this._data.server_public_key
		}, '/api/password/allmeta', {
			instance_id: this._data.instance_id
		}, {
			count: this._upCount(),
			token: this._data.login_auth,
			password_hash: verifyHashed
		});
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
}