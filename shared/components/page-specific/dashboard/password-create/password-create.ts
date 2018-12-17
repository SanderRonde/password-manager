/// <reference path="../../../../types/elements.d.ts" />

import { config, ConfigurableWebComponent, Props, ComplexType, PROP_TYPE, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { GlobalController } from '../../../entrypoints/base/global/global-controller';
import { MaterialCheckbox } from '../../../util/material-checkbox/material-checkbox';
import { getDefaultResponseError } from '../../../entrypoints/web/login/login-web';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { MetaPasswords } from '../../../entrypoints/base/dashboard/dashboard';
import { MaterialInput } from '../../../util/material-input/material-input';
import { findElementInPath, wait } from '../../../../lib/webcomponent-util';
import { PaperButton } from '../../../util/paper-button/paper-button';
import { createClientAPIRequest } from '../../../../lib/apirequests';
import { PasswordDetail } from '../password-detail/password-detail';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { IconButton } from '../../../util/icon-button/icon-button';
import { PasswordCreateIDMap } from './password-create-querymap';
import { getHost } from '../password-form/password-form.html';
import { PasswordCreateHTML } from './password-create.html';
import { PasswordCreateCSS } from './password-create.css';
import { bindToClass } from '../../../../lib/decorators';
import { encrypt } from '../../../../lib/browser-crypto';
import { JSONResponse } from '../../../../types/api';

@config({
	is: 'password-create',
	css: PasswordCreateCSS,
	html: PasswordCreateHTML,
	dependencies: [
		MaterialInput,
		PaperToast,
		IconButton,
		PaperButton,
		MaterialCheckbox,
		AnimatedButton
	]
})
export class PasswordCreate extends ConfigurableWebComponent<PasswordCreateIDMap> {
	props = Props.define(this, {
		priv: {
			passwordVisible: PROP_TYPE.BOOL,
			selectedDisplayed: ComplexType<MetaPasswords[0]|null>()
		},
		reflect: {
			parent: {
				type: ComplexType<PasswordDetail>()
			}
		}
	});
	
	@bindToClass
	public removeLastWebsite() {
		PaperToast.createHidable('There needs to be at least one website', 3500);
	}

	public getSelectedViewSize(password: MetaPasswords[0]|null,
		websites: MetaPasswords[0]['websites'] = (password && password.websites) || []) {
			return 540 + 60 + ((websites.length - 1) * (166));
		}

	private async _sizeChange(websites: MetaPasswords[0]['websites'] = this.props.selectedDisplayed!.websites) {	
		await this.props.parent.$.sizer.setSize(this.getSelectedViewSize(
			this.props.selectedDisplayed, websites));
	}

	private _faviconQueries: Map<string, {
		state: 'fetching'|'found'|'invalid';
		url: string;
	}> = new Map();

	public getFavicon(host: string) {
		const fetchURL = `://${host}/favicon.ico`;
		this._faviconQueries.set(host, {
			state: 'fetching',
			url: `https:${fetchURL}`
		});

		return fetch(`https:${fetchURL}`).catch(() => {
			return fetch(`http:${fetchURL}`);
		});
	}

	private _lastUpdatedState: MetaPasswords[0]['websites'] = [];
	private _setWebsitesExternal(websites: MetaPasswords[0]['websites']) {
		//Fetch all favicons
		websites = websites.map((website) => {
			if (this._faviconQueries.has(website.host)) {
				if (this._faviconQueries.get(website.host)!.state === 'found') {
					return {
						host: website.host,
						exact: website.exact,
						favicon: this._faviconQueries.get(website.host)!.url
					}
				}
			} else {
				//Fetch it then
				const fetchURL = `://${website.host}/favicon.ico`;
				this._faviconQueries.set(website.host, {
					state: 'fetching',
					url: `https:${fetchURL}`
				});

				this.getFavicon(website.host).then((res) => {
					this._faviconQueries.set(website.host, {
						state: 'found',
						url: new URL(res.url).origin
					});

					//Update the last sent state
					this._setWebsitesExternal(this._lastUpdatedState);
				}).catch(() => {
					this._faviconQueries.set(website.host, {
						state: 'invalid',
						url: fetchURL
					});
				});
			}
			return website;
		});
		this._lastUpdatedState = websites;
		this.props.parent.props.ref.updateAddedPassword('websites', websites);
	}

	private _readWebsitesState() {
		const container = this.$.passwordWebsites;
		const websites: MetaPasswords[0]['websites'] = [
			...container.querySelectorAll('.passwordWebsite')
		].map((child) => {
			const container = child.querySelector('.passwordWebsiteExact')!;
			const exact = (container as MaterialInput).value;
			const host = getHost(exact);
			return {
				exact,
				host,
				favicon: null
			}
		});
		return websites;
	}

	public async usernameChange() {
		await wait(0);
		this.props.parent.props.ref.updateAddedPassword('username', this.$.passwordUsername.value);
	}

	@bindToClass
	public async urlChange() {
		//Wait for changes to reflect to the DOM
		await wait(0);

		this._setWebsitesExternal(this._readWebsitesState());
	}

	@bindToClass
	public async addWebsite() {
		const newWebsites = [...this._readWebsitesState(), {
			host: '',
			exact: '',
			favicon: null
		}];
		await this._sizeChange(newWebsites);
		this.props.selectedDisplayed!.websites.push({
			host: '',
			exact: '',
			favicon: null
		});
		this._setWebsitesExternal(newWebsites);
		this.renderToDOM(CHANGE_TYPE.PROP);
	}

	@bindToClass
	public async removeWebsite(e: MouseEvent & {
		path: HTMLElement[];
	}) {
		const container = findElementInPath(e.path, '.passwordWebsite');
		const index = container && container.getAttribute('data-index');
		if (!container || !index) {
			PaperToast.createHidable('Failed to remove website', 3500);
			return;
		}

		const copy = this._readWebsitesState();
		const newWebsites = [...copy.slice(0, -1)];
		this.props.selectedDisplayed!.websites.splice(~~index, 1);
		await this._sizeChange(newWebsites);
		this._setWebsitesExternal(newWebsites);
		this.renderToDOM(CHANGE_TYPE.PROP);
	}

	@bindToClass
	public twofactorSelectedChange(isChecked: boolean) {
		this.props.selectedDisplayed!.twofactor_enabled = isChecked;
		this.props.parent.props.ref.updateAddedPassword('twofactor_enabled', isChecked);
	}

	init() {
		this.props.selectedDisplayed = {...this.props.parent.props.ref.props.newPassword!};
		this.props.passwordVisible = false;
	}
	
	onToggleShowPasswordClick() {
		this.props.passwordVisible = !this.props.passwordVisible;
	}

	private _completedCreate() {
		this.props.parent.props.ref.props.newPassword = null;
		this.props.parent.props.ref.$.infiniteList.props.disabled = false;
		this.props.parent.props.ref.fetchMeta();
	}

	public async finish() {
		const encryptHash = this.getRoot<GlobalController>().getData('decryptHash');
		if (!encryptHash) {
			PaperToast.createHidable('Failed to get encryption hash');
			return;
		}
		const request = createClientAPIRequest({
			publicKey: this.props.parent.props.authData.server_public_key
		}, '/api/password/set', {
			instance_id: this.props.parent.props.authData.instance_id
		}, {
			token: this.getRoot<GlobalController>().getAPIToken(),
			count: this.getRoot<GlobalController>().getRequestCount(),
			websites: await Promise.all(this._readWebsitesState().map(async (website) => {
				const favicon = await this.props.parent.fetchFavicon(website.exact);
				return {
					url: website.exact,
					favicon: favicon
				}
			})),
			twofactor_enabled: this.props.selectedDisplayed!.twofactor_enabled,
			username: this.$.passwordUsername.value,
			encrypted: encrypt({
				twofactor_secret: this.$.twofactorToken.value || null,
				password: this.$.passwordPassword.value,
				notes: this.$.noteInput.value.split('\n')
			}, encryptHash.hash, 'aes-256-ctr')
		});

		let prom = request.fn();
		let res: JSONResponse<any>;
		PaperToast.createLoading({
			loading: 'Creating password',
			get failure() {
				return getDefaultResponseError((res || {}) as any);
			},
			success: 'Created password'
		}, new Promise((resolve, reject) => {
			prom.then((res) => {
				if (res.success) {
					resolve();
				} else {
					reject();
				}
			});
		}), () => {
			this.$.saveChanges.setState('loading');
			prom = request.fn();
			prom.then((response) => {
				res = response;
				if (res.success) {
					this._completedCreate();
				}
				this.$.saveChanges.setState(
					res.success ?
						'success' : 'failure');
			});
			return prom;
		});
		this.$.saveChanges.setState('loading');
		res = await prom;
		this.$.saveChanges.setState(
			res.success ?
				'success' : 'failure');
		if (res.success) {
			this._completedCreate();
		}
	}

	public discard() {
		this.props.parent.props.ref.cancelNewPassword();
	}
}