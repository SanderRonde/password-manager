/// <reference path="../../../../types/elements.d.ts" />

import { config, ConfigurableWebComponent, Props, ComplexType, PROP_TYPE, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { MetaPasswords } from '../../../entrypoints/base/dashboard/dashboard';
import { MaterialInput } from '../../../util/material-input/material-input';
import { findElementInPath, wait } from '../../../../lib/webcomponent-util';
import { PasswordDetail } from '../password-detail/password-detail';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { PasswordCreateIDMap } from './password-create-querymap';
import { getHost } from '../password-form/password-form.html';
import { PasswordCreateHTML } from './password-create.html';
import { PasswordCreateCSS } from './password-create.css';
import { bindToClass } from '../../../../lib/decorators';

@config({
	is: 'password-create',
	css: PasswordCreateCSS,
	html: PasswordCreateHTML
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
				const fetchURL = `http://s2.googleusercontent.com/s2/favicons?domain_url=${website.host}`;
				this._faviconQueries.set(website.host, {
					state: 'fetching',
					url: fetchURL
				});
				fetch(fetchURL).then((res) => {
					return res.text();
				}).then(async (text) => {
					if (text === await this._fallbackFavicon) {
						this._faviconQueries.set(website.host, {
							state: 'invalid',
							url: fetchURL
						});
					} else {
						this._faviconQueries.set(website.host, {
							state: 'found',
							url: fetchURL
						});

						//Update the last sent state
						this._setWebsitesExternal(this._lastUpdatedState);
					}
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

	@bindToClass
	public u2fSelectedChange(isChecked: boolean) {
		this.props.selectedDisplayed!.u2f_enabled = isChecked;
		this.props.parent.props.ref.updateAddedPassword('u2f_enabled', isChecked);
	}

	private _fallbackFavicon: Promise<string>|null = null;

	init() {
		this.props.selectedDisplayed = {...this.props.parent.props.ref.props.newPassword!};
		this.props.passwordVisible = false;
		this._fallbackFavicon = fetch('http://s2.googleusercontent.com/s2/favicons?domain_url=fallback').then(res => res.text());
	}
	
	onToggleShowPasswordClick() {
		this.props.passwordVisible = !this.props.passwordVisible;
	}

	public finish() {
		//TODO: check U2F and 2FA support
	}

	public discard() {
		this.props.parent.props.ref.cancelNewPassword();
	}
}