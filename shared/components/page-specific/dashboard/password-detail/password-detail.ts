/// <reference path="../../../../types/elements.d.ts" />

import { config, defineProps, ComplexType, wait, isNewElement, listenWithIdentifier, reportDefaultResponseErrors, findElementInPath, PROP_TYPE, createCancellableTimeout } from '../../../../lib/webcomponent-util';
import { APIToken, ERRS, U2FToken, Encrypted, Hashed, Padded, MasterPasswordDecryptionpadding, EncryptionAlgorithm } from '../../../../types/crypto';
import { StringifiedObjectId, EncryptedInstance, ServerPublicKey, PublicKeyDecrypted, MasterPassword } from '../../../../types/db-types';
import { PasswordDetailHTML, passwordDetailDataStore, passwordDetailDataSymbol } from './password-detail.html';
import { PasswordDetailCSS, VIEW_FADE_TIME, STATIC_VIEW_HEIGHT } from './password-detail.css';
import { decryptWithPrivateKey, decrypt, encrypt } from '../../../../lib/browser-crypto';
import { MetaPasswords, Dashboard } from '../../../entrypoints/base/dashboard/dashboard';
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { MaterialCheckbox } from '../../../util/material-checkbox/material-checkbox';
import { doClientAPIRequest, filterUndefined } from '../../../../lib/apirequests';
import { LoadingSpinner } from '../../../util/loading-spinner/loading-spinner';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { MaterialInput } from '../../../util/material-input/material-input';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { API_ERRS, APISuccessfulReturns } from '../../../../types/api';
import { SizingBlock } from '../../../util/sizing-block/sizing-block';
import { IconButton } from '../../../util/icon-button/icon-button';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { PasswordDetailIDMap } from './password-detail-querymap';
import { MoreInfo } from '../../../util/more-info/more-info';
import { ENTRYPOINT } from '../../../../types/shared-types';
import { bindToClass } from '../../../../lib/decorators';
import { isSupported, sign } from 'u2f-api';
import { U2FSignResponse } from 'u2f';

const MIN_LOADING_TIME = 100;

export interface PasswordDetailData {
	instance_id: StringifiedObjectId<EncryptedInstance>;
	server_public_key: ServerPublicKey;
	auth_token: APIToken;
};

interface PasswordDetailChanges {
	username: string;
	password: string;
	notes: string[];
	twofactor_enabled: boolean;
	u2f_enabled: boolean;
	websites: {
		url: string
	}[];
}
type ToBools<T> = {
	[P in keyof T]: boolean;
};

const enum TWOFACTOR_CHECK_STATE {
	IN_PROGRESS,
	FAILED,
	SUCCEEDED
};

export function getHost(fullUrl: string) {
	const originalUrl = fullUrl;
	if (fullUrl.indexOf('http') !== 0) {
		fullUrl = `http://${fullUrl}`;
	}
	try {
		const constructedURL = new URL(fullUrl);
		return constructedURL.hostname ||
			constructedURL.host || originalUrl;
	} catch(e) {
		return originalUrl;
	}
}

@config({
	is: 'password-detail',
	css: PasswordDetailCSS,
	html: PasswordDetailHTML,
	dependencies: [
		SizingBlock,
		VerticalCenterer,
		MaterialInput,
		IconButton,
		PaperToast,
		AnimatedButton,
		LoadingSpinner,
		MaterialCheckbox,
		MoreInfo
	]
})
export class PasswordDetail extends ConfigurableWebComponent<PasswordDetailIDMap> {
	props = defineProps(this, {
		priv: {
			selectedDisplayed: ComplexType<MetaPasswords[0]>(),
			selected: ComplexType<MetaPasswords[0]>(),
			visibleWebsites: {
				type: ComplexType<MetaPasswords[0]['websites']>(),
				value: []
			},
			authData: ComplexType<PasswordDetailData>(),
			passwordVisible: PROP_TYPE.BOOL,
			ref: ComplexType<Dashboard>()
		}
	});

	private _authState: {
		u2fToken: null|U2FToken;
		u2fAuthenticated: null|U2FSignResponse;
		twofactorAuthentication: null|string;
	} = {
		u2fToken: null,
		u2fAuthenticated: null,
		twofactorAuthentication: null
	};

	private _postViewCallback: (() => void)|null = null;

	constructor() {
		super();

		this.listen('propChange', (name, oldValue, newValue) => {
			if (name === 'selected') {
				this._selectedChange(oldValue, newValue);
			}
		});
	}

	public onDelete() {
		//TODO: confirm deletion
		//TODO: actually delete
	}

	private static _isValidURL(url: string) {
		try {
			new URL(url);
			return true;
		} catch(e) {
			return false;
		}
	}

	public onLinkClick(e: MouseEvent & {
		path: HTMLElement[];
	}) {
		const input = findElementInPath<MaterialInput>(e.path, 'material-input');
		if (!input) {
			PaperToast.create({
				content: 'Failed to open link',
				duration: PaperToast.DURATION.SHORT
			});
			return;
		}

		if (PasswordDetail._isValidURL(input.value)) {
			window.open(input.value, '_blank');
		} else {
			window.open(`//${input.value}`, '_blank');
		}
	}

	private _copyText(text: string) {
		const el = document.createElement('textarea');  
		el.value = text;                                
		el.style.position = 'absolute';                
		el.style.left = '-9999px';                      
		document.body.appendChild(el);                  
	
		const selected =           
			document.getSelection().rangeCount > 0        
				? document.getSelection().getRangeAt(0)     
				: false;                                    
		el.select();                                    
		document.execCommand('copy');                   
		document.body.removeChild(el);                  
		if (selected) {                                 
			document.getSelection().removeAllRanges();    
			document.getSelection().addRange(selected);   
		}
	}

	private _copyMap: WeakMap<HTMLElement, number> = new WeakMap();

	@bindToClass
	public copyCredential(e: MouseEvent & {
		path: HTMLElement[]
	}) {
		const input = findElementInPath<MaterialInput>(e.path, 'material-input');
		if (!input) {
			PaperToast.create({
				content: 'Failed to copy text',
				duration: PaperToast.DURATION.SHORT
			});
			return;
		}
		
		this._copyText(input.value);

		input.classList.add('done');
		if (this._copyMap.has(input)) {
			window.clearTimeout(this._copyMap.get(input));
		}
		
		PaperToast.create({
			content: 'Copied',
			duration: PaperToast.DURATION.SHORT
		});
		this._copyMap.set(input, window.setTimeout(() => {
			input.classList.remove('done');
		}, 2500));
	}

	@bindToClass
	public onToggleShowPasswordClick() {
		this.props.passwordVisible = !this.props.passwordVisible;
	}

	private async _sizeChange(websites: MetaPasswords[0]['websites']) {	
		await this.$.sizer.setSize(PasswordDetail._getSelectedViewSize(
			this.props.selectedDisplayed, websites));
	}

	@bindToClass
	public async addWebsite() {
		const newWebsites = [...this.props.visibleWebsites, {
			host: '',
			exact: '',
			favicon: null
		}];
		await this._sizeChange(newWebsites);
		this.props.visibleWebsites.push({
			host: '',
			exact: '',
			favicon: null
		});
	}

	@bindToClass
	public async removeLastWebsite() {
		PaperToast.createHidable('Last website can\'t be removed', 3500);
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

		const newWebsites = [...this.props.visibleWebsites.slice(0, -1)];
		this.props.visibleWebsites.splice(~~index, 1);
		await this._sizeChange(newWebsites);
	}

	@bindToClass
	public async discardChanges() {
		if (!this._hasChanged(this._getChanged(this._getFormData()))) {
			PaperToast.create({
				content: 'No changes to discard',
				duration: PaperToast.DURATION.SHORT
			});
		}

		//Reset to default values
		this._setSelected(this.props.selected);
	}

	private _getWebsites() {
		const websiteElements = Array.prototype.slice.apply(
			this.$.passwordWebsites.querySelectorAll('.passwordWebsite')) as HTMLElement[];
		return websiteElements.map((element) => {
			return {
				url: (element.querySelector('.passwordWebsiteExact') as MaterialInput).value
			}
		});
	}

	private static _areSameString(str1: string, str2: string): boolean {
		if (!str1 || !str2) {
			return !str1 === !str2;
		}
		return str1.trim() === str2.trim();
	}

	private _getChanged(newPassword: PasswordDetailChanges): ToBools<PasswordDetailChanges> {
		let websitesChanged: boolean = false;
		if (this.props.selected.websites.length !== newPassword.websites.length) {
			websitesChanged = true;
		}
		for (let i = 0; i < this.props.selected.websites.length; i++) {
			if (!PasswordDetail._areSameString(
				this.props.selected.websites[i].exact,
				newPassword.websites[i].url)) {
					websitesChanged = true;
				}
		}
		return {
			username: !PasswordDetail._areSameString(this.props.selected.username,
				newPassword.username),
			password: !PasswordDetail._areSameString(newPassword.password,
				passwordDetailDataStore[passwordDetailDataSymbol]!.password),
			notes: !PasswordDetail._areSameString(newPassword.notes.join('\n'),
				passwordDetailDataStore[passwordDetailDataSymbol]!.notes.join('\n')),
			twofactor_enabled: this.props.selected.twofactor_enabled !== newPassword.twofactor_enabled,
			u2f_enabled: this.props.selected.u2f_enabled !== newPassword.u2f_enabled,
			websites: websitesChanged
		};
	}

	private _hasChanged(changed: ToBools<PasswordDetailChanges>) {
		return changed.username ||
			changed.password ||
			changed.notes ||
			changed.twofactor_enabled ||
			changed.u2f_enabled ||
			changed.websites;
	}

	private async _check2faChanges(newData: PasswordDetailChanges,
		changed: ToBools<PasswordDetailChanges>, callback: (success: boolean) => void) {
			//Check if it's set up
			const request = doClientAPIRequest({
				publicKey: this.props.authData.server_public_key
			}, '/api/instance/2fa/is_setup', {
				instance_id: this.props.authData.instance_id
			}, {
				token: this.getRoot().getAPIToken(),
				count: this.getRoot().getRequestCount()
			});
			await this._quickAnimateSelected(request);
			const response = await request;
			if (response.success) {
				if (!response.data.enabled) {
					PaperToast.createHidable('2FA is not set up for this account,' + 
						' applying all non-2fa changes', PaperToast.DURATION.LONG);
				} else {
					//Get a valid 2FA token
					await this._animateView('twofactorRequiredView', STATIC_VIEW_HEIGHT, () => {
						this.$$('.twofactorDigit').forEach((el: HTMLInputElement) => {
							el.value = '';
						});
					});
					this._postViewCallback = () => {
						this._saveChanges(newData, changed, callback);
					};
					const firstDigit = this.$('#digit0') as HTMLInputElement;
					firstDigit && firstDigit.focus();
					return TWOFACTOR_CHECK_STATE.IN_PROGRESS;
				}
			} else {
				reportDefaultResponseErrors(response, PaperToast);
				return TWOFACTOR_CHECK_STATE.FAILED;
			}
			return TWOFACTOR_CHECK_STATE.SUCCEEDED;
		}

	private async _checkU2fChanges(newData: PasswordDetailChanges,
		changed: ToBools<PasswordDetailChanges>, callback: (success: boolean) => void) {
			if (!changed.u2f_enabled) {
				return;
			}

			//Combine these two requests
			const request = doClientAPIRequest({
				publicKey: this.props.authData.server_public_key
			}, '/api/instance/u2f/gen_request', {
				instance_id: this.props.authData.instance_id
			}, {
				token: this.getRoot().getAPIToken(),
				count: this.getRoot().getRequestCount()
			});
			await this._quickAnimateSelected(request);
			const response = await request;
			if (response.success) {
				this._signU2FRequest(response.data.request).then(() => {
					this._saveChanges(newData, changed, callback);
				});
				return TWOFACTOR_CHECK_STATE.IN_PROGRESS;
			} else if (response.ERR === API_ERRS.INVALID_CREDENTIALS && 
				response.error === 'U2F not enabled') {
					PaperToast.createHidable('U2F is not set up for this account,' + 
						' applying all non-u2f changes', PaperToast.DURATION.LONG);
				} else {
					reportDefaultResponseErrors(response, PaperToast);
					return TWOFACTOR_CHECK_STATE.FAILED;
				}
				return TWOFACTOR_CHECK_STATE.SUCCEEDED;
		}

	private _ifEnabled<T>(enabled: boolean, value: T): T|undefined;
	private _ifEnabled<T>(enabled: true, value: T): T;
	private _ifEnabled<T>(enabled: false, value: T): undefined;
	private _ifEnabled<T>(enabled: boolean, value: T): T|undefined {
		if (enabled) {
			return value;
		}
		return undefined;
	}

	private async _fetchFavicon(url: string): Promise<{
		mime: string;
		content: string;
	}|null> {
		return new Promise<{
			mime: string;
			content: string;
		}|null>((resolve) => {
			fetch(`http://s2.googleusercontent.com/s2/favicons?domain_url=${url}`).then(async (res) => {
				res.blob().then((blob) => {
					const reader = new FileReader();
					reader.readAsDataURL(blob); 
					reader.onloadend = () => {
						resolve({
							mime: res.headers.get('Content-Type') || 'image/png',
							content: reader.result!.toString().split(',')[1]
						});
					}
				});
			}).catch(() => {
				resolve(null);
			});
		});
	}

	private _getWebsiteDiff(newData: PasswordDetailChanges) {
		return {
			added: newData.websites.filter((website) => {
				for (const oldWebsite of this.props.selectedDisplayed.websites) {
					if (getHost(website.url) === oldWebsite.host) {
						//Not new
						return false;
					}
				}
				//New
				return true;
			}),
			removed: this.props.selectedDisplayed.websites.filter((website) => {
				for (const newWebsite of newData.websites) {
					if (getHost(newWebsite.url) === website.host) {
						//Not removed
						return false;
					}
				}
				//Removed
				return true;
			})
		}
	}

	private async _saveChanges(newData: PasswordDetailChanges, 
		changed: ToBools<PasswordDetailChanges>, callback: (success: boolean) => void) {
			if (!changed.twofactor_enabled && this._authState.u2fAuthenticated === null) {
				if (await this._checkU2fChanges(newData, changed, callback) !== TWOFACTOR_CHECK_STATE.SUCCEEDED) {
					//Either it's waiting for the next view or it failed
					return;
				}
			}
			if (!changed.twofactor_enabled && this._authState.twofactorAuthentication === null) {
				if (await this._check2faChanges(newData, changed, callback) !== TWOFACTOR_CHECK_STATE.SUCCEEDED) {
					//Either it's waiting for the next view or it failed
					return;
				}
			}

			const { added, removed } = this._getWebsiteDiff(newData);
			const addedWithFavicons = await Promise.all(added.map(async (addedWebsite) => {
				return {
					url: addedWebsite.url,
					favicon: await this._fetchFavicon(addedWebsite.url)
				}
			}));

			const decryptHash = this.getRoot().getData('decryptHash');
			if (!decryptHash) {
				PaperToast.createHidable('Failed to decrypt server response');
				return;
			}
			const encryptedData: EncodedString<{
				data: Encrypted<EncodedString<{
					password: string;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}>|undefined = (!changed.password && !changed.notes) ? undefined : 
				encrypt({
					password: newData.password,
					notes: newData.notes
				}, decryptHash.hash, 'aes-256-ctr');

			//Apply changes
			const request = doClientAPIRequest({
				publicKey: this.props.authData.server_public_key
			}, '/api/password/update', {
				instance_id: this.props.authData.instance_id
			}, filterUndefined({
				//Auth stuff
				token: this.getRoot().getAPIToken(),
				password_id: this.props.selected.id,
				count: this.getRoot().getRequestCount(),
				twofactor_token: this.props.selected.twofactor_enabled ?
					this._authState.twofactorAuthentication! : undefined,
				response: this.props.selected.u2f_enabled ?
					this._authState.u2fAuthenticated! : undefined,
				u2f_token: (this.props.selected.u2f_enabled ?
					this._authState.u2fToken! : undefined),

				//Changes
				removedWebsites: this._ifEnabled(changed.websites, removed.map((website) => {
					return {
						url: website.exact
					}
				})),
				addedWebsites: this._ifEnabled(changed.websites, addedWithFavicons),
				username: this._ifEnabled(changed.username, newData.username),
				twofactor_enabled: this._ifEnabled(changed.twofactor_enabled, 
					newData.twofactor_enabled),
				u2f_enabled: this._ifEnabled(changed.u2f_enabled,
					newData.u2f_enabled),
				encrypted: this._ifEnabled(changed.password || changed.notes,
					encryptedData)
			}));
			await this._quickAnimateSelected(request);
			const response = await request;

			if (changed.twofactor_enabled || changed.u2f_enabled ||
				changed.websites || changed.username) {
					//Update preview
					this.props.ref && this.props.ref.fetchMeta();
				}

			return response;
		}

	private _getFormData(): PasswordDetailChanges {
		return {
			username: this.$.passwordUsername.value,
			password: this.$.passwordPassword.value,
			notes: this.$.noteInput.value.split('\n'),
			twofactor_enabled: this.$.passwordSettings2faCheckbox.checked,
			u2f_enabled: this.$.passwordSettingsu2fCheckbox.checked,
			websites: this._getWebsites()
		};
	}

	@bindToClass
	public async saveChanges() {
		const newData = this._getFormData();
		const changed = this._getChanged(newData);

		if (!this._hasChanged(changed)) {
			PaperToast.createHidable('No changes', PaperToast.DURATION.SHORT);
			return;
		}

		this.$.saveChanges.setState('loading');
		await wait(300);
		const [, response] = await Promise.all([
			wait(300), 
			new Promise<{
				success: boolean;
			}>((resolve) => {
				this._saveChanges(newData, changed, (success) => {
					resolve({
						success
					});
				});
			})
		]);
		if (response.success) {
			this.$.saveChanges.setState('success');
			createCancellableTimeout(this, 'save-button', () => {
				this.$.saveChanges.setState('regular');
			}, 3000);
			PaperToast.createHidable('Successfully updated password', 
				PaperToast.DURATION.SHORT);
		} else {
			this.$.saveChanges.setState('failure');
			createCancellableTimeout(this, 'save-button', () => {
				this.$.saveChanges.setState('regular');
			}, 3000);
		}
	}

	private static _getSelectedViewSize(password: MetaPasswords[0],
		websites: MetaPasswords[0]['websites'] = (password && password.websites) || []) {
			//Height without websites: 513
			//Single website height: 156
			//Size per website: 156 + 10px margin
			return 513 + 156 + ((websites.length - 1) * (156 + 10));
		}

	private async _hideAll() {
		this.$$('.view').forEach((view) => {
			view.classList.remove('visible');
		});
		await wait(VIEW_FADE_TIME);
		this.$$('.view').forEach((view) => {
			view.classList.remove('displayed');
		});
	}

	private _cancelCurrentAnimation: null|(() => void) = null;
	private async _animateView(view: keyof PasswordDetailIDMap, newSize: number, between?: () => void) {
		let stop: boolean = false;

		this._cancelCurrentAnimation = () => {
			stop = true;
		};
		await this._hideAll();
		if (stop) return;
		await this.$.sizer.setSize(newSize);
		if (stop) return;
		between && between();
		this.$[view].classList.add('displayed');
		this.$[view].classList.add('visible');
		await wait(VIEW_FADE_TIME);
		this._cancelCurrentAnimation = null;
	}

	private _setSelected(item: MetaPasswords[0] = this.props.selected) {
		this.props.selectedDisplayed = item;
		if (item && item.websites) {
			this.props.visibleWebsites = item.websites;
		}
	}

	private async _selectedChange(oldValue: MetaPasswords[0]|null, newValue: MetaPasswords[0]|null) {
		if (oldValue && newValue && oldValue.id === newValue.id) {
			//Just a list update, nothing to change
			this._setSelected();
			return;
		}

		if (this._cancelCurrentAnimation) {
			this._cancelCurrentAnimation();
		}

		if (newValue !== null) {
			this._authState = {
				u2fToken: null,
				u2fAuthenticated: null,
				twofactorAuthentication: null
			};

			this._getPasswordDetails(newValue);
		} else if (oldValue !== null) {
			await this._animateView('noneSelectedView', STATIC_VIEW_HEIGHT);
		} else {
			this._setSelected();
		}
	}

	private static _tryParse<T>(data: EncodedString<T>): {
		success: true;
		data: T;
	}|{
		success: false;
	} {
		try {
			return {
				success: true,
				data: JSON.parse(data)
			}
		} catch(e) {
			return {
				success: false
			}
		}
	}

	private async _showFailedView(retryFn: () => void) {
		this._postViewCallback = retryFn;
		await this._animateView('failedView', STATIC_VIEW_HEIGHT, () => {
			//Reset auth state
			this._authState.twofactorAuthentication = null;
			this._authState.u2fAuthenticated = null;
			this.$.retryButton.setState('regular');
		});
	}
	
	private _failDecryptServerResponse() {
		PaperToast.createHidable('Failed to decrypt server response',
			PaperToast.DURATION.LONG);
		this._showFailedView(this._signU2F);
	}

	private _activeRequests: PublicKeyDecrypted<
		APISuccessfulReturns['/api/password/getmeta']['encrypted']>['requests'] = null;
	private async _signU2FRequest(requests: Exclude<PublicKeyDecrypted<
		APISuccessfulReturns['/api/password/getmeta']['encrypted']>['requests'], null>) {
			this._activeRequests = requests;
			const { signed, request } = await Promise.race([
				new Promise<{
					signed: U2FSignResponse;
					request: U2FToken;
				}>((resolve) => {
					sign(requests.main.request).then((signed) => {
						resolve({
							signed: signed as any,
							request: requests.main.u2f_token
						});
					});
				}),
				new Promise<{
					signed: U2FSignResponse;
					request: U2FToken;
				}>((resolve) => {
					sign(requests.backup.request).then((signed) => {
						resolve({
							signed: signed as any,
							request: requests.backup.u2f_token
						});
					});
				})
			]);
			if (this._activeRequests !== requests) {
				return;
			}
			
			this._authState.u2fAuthenticated = signed;
			this._authState.u2fToken = request;
		}

	private _nextView() {
		this._postViewCallback && this._postViewCallback();
		this._postViewCallback = null;
	}
	
	@bindToClass
	private async _signU2F() {
		const supported = await isSupported();
		if (!supported) {
			PaperToast.createHidable('U2F is not supported in your browser',
				PaperToast.DURATION.LONG);
			this._showFailedView(this._signU2F);
			return;
		}

		if (!this.props.authData.server_public_key || 
			!this.props.authData.instance_id) {
				PaperToast.createHidable(
					'Failed to set up public and/or private key with server',
					PaperToast.DURATION.LONG);
				this._showFailedView(this._signU2F);
				return;
			}

		//Do the request
		const clientPrivateKey = localStorage.getItem('instance_private_key');

		if (!clientPrivateKey && !document.body.classList.contains('dev')) {
			PaperToast.createHidable(
				'Failed to set up public and/or private key with server' + 
					(this._globalProperties.isWeb === 'true' ? 
						', redirecting to login page...' :
						', please delete this instance and create a new instance to fix it'),
				PaperToast.DURATION.LONG);
			if (this._globalProperties.isWeb === 'true') {
				this.getRoot().changePage(ENTRYPOINT.LOGIN);
			}
			this._showFailedView(this._signU2F);
			return;
		}

		const usedId = this.props.selected.id;
		const response = await doClientAPIRequest({
			publicKey: this.props.authData.server_public_key
		}, '/api/password/getmeta', {
			instance_id: this.props.authData.instance_id
		}, {
			token: this.getRoot().getAPIToken(),
			count: this.getRoot().getRequestCount(),
			password_id: usedId
		});

		if (usedId !== this.props.selected.id) {
			return;
		}

		if (response.success) {
			//Decrypt with public key
			const publicKeyDecrypted = decryptWithPrivateKey(response.data.encrypted,
				clientPrivateKey || (document.body.classList.contains('dev') ?
					(response.data as any).privateKey : clientPrivateKey));
			if (publicKeyDecrypted === ERRS.INVALID_DECRYPT) {
				this._failDecryptServerResponse();
				return;
			}

			const parseResult = PasswordDetail._tryParse(publicKeyDecrypted);
			if (parseResult.success === false) {
				this._failDecryptServerResponse();
				return;
			}
			const publicKeyDecryptedParsed = parseResult.data;
			await this._signU2FRequest(publicKeyDecryptedParsed.requests!);
			if (usedId !== this.props.selected.id) {
				return;
			}
			this._nextView();
		} else {
			reportDefaultResponseErrors(response, PaperToast);
			this._showFailedView(this._signU2F);
		}
	}

	private async _quickAnimateSelected(promise: Promise<any>) {
		if (this.$.selectedView.classList.contains('visible')) {
			this.$.selectedView.classList.add('quickAnimate');

			//Hide it for now
			this.$.selectedView.classList.remove('visible');

			const resolved = await Promise.race([
				promise, wait(MIN_LOADING_TIME)
			]);

			//Show it again
			this.$.selectedView.classList.add('visible');
			this.$.selectedView.classList.remove('quickAnimate');

			if (!resolved) {
				//Wait resolved, not the request, show loading view
				await Promise.all([
					this._animateView('loadingView', STATIC_VIEW_HEIGHT),
					promise
				]);
			}
		} else {
			await Promise.all([
				this._animateView('loadingView', STATIC_VIEW_HEIGHT),
				promise
			]);
		}
	}

	@bindToClass
	private async _getPasswordDetails(passwordMeta: MetaPasswords[0] = this.props.selected) {
		if (passwordMeta.twofactor_enabled && this._authState.twofactorAuthentication === null) {
			await this._animateView('twofactorRequiredView', STATIC_VIEW_HEIGHT, () => {
				this.$$('.twofactorDigit').forEach((el: HTMLInputElement) => {
					el.value = '';
				});
			});
			this._postViewCallback = this._getPasswordDetails;
			const firstDigit = this.$('#digit0') as HTMLInputElement;
			firstDigit && firstDigit.focus();
			return;
		} else if (passwordMeta.u2f_enabled && this._authState.u2fAuthenticated === null) {
			await this._animateView('u2fRequiredView', STATIC_VIEW_HEIGHT, () => {
				this._signU2F();
			});
			this._postViewCallback = this._getPasswordDetails;
			return;
		}

		//Do the request
		const clientPrivateKey = localStorage.getItem('instance_private_key');

		if (!clientPrivateKey && !document.body.classList.contains('dev')) {
			PaperToast.createHidable(
				'Failed to set up public and/or private key with server' + 
					(this._globalProperties.isWeb === 'true' ? 
						', redirecting to login page...' :
						', please delete this instance and create a new instance to fix it'),
				PaperToast.DURATION.LONG);
			if (this._globalProperties.isWeb === 'true') {
				this.getRoot().changePage(ENTRYPOINT.LOGIN);
			}
			this._showFailedView(this._getPasswordDetails);
			return;
		}

		const request = doClientAPIRequest({
			publicKey: this.props.authData.server_public_key
		}, '/api/password/get', {
			instance_id: this.props.authData.instance_id
		}, filterUndefined({
			token: this.getRoot().getAPIToken(),
			password_id: this.props.selected.id,
			count: this.getRoot().getRequestCount(),
			twofactor_token: this.props.selected.twofactor_enabled ?
				this._authState.twofactorAuthentication! : undefined,
			response: this.props.selected.u2f_enabled ?
				this._authState.u2fAuthenticated! : undefined,
			u2f_token: (this.props.selected.u2f_enabled ?
				this._authState.u2fToken! : undefined)
		}));

		//Reset authstate
		this._authState = {
			twofactorAuthentication: null,
			u2fAuthenticated: null,
			u2fToken: null
		};
		await this._quickAnimateSelected(request);
		const response = await request;
		if (response.success) {
			//Decrypt with public key
			const publicKeyDecrypted = decryptWithPrivateKey(response.data.encrypted,
				clientPrivateKey || (document.body.classList.contains('dev') ?
					(response.data as any).privateKey : clientPrivateKey));
			if (publicKeyDecrypted === ERRS.INVALID_DECRYPT) {
				this._failDecryptServerResponse();
				return;
			}

			const parseResult = PasswordDetail._tryParse(publicKeyDecrypted);
			if (parseResult.success === false) {
				this._failDecryptServerResponse();
				return;
			}
			const publicKeyDecryptedParsed = parseResult.data;
			const decryptHash = this.getRoot().getData('decryptHash');
			if (!decryptHash) {
				this._failDecryptServerResponse();
				return;
			}
			const decryptedPasswordData = decrypt(publicKeyDecryptedParsed.encrypted, 
				decryptHash.hash);
			if (decryptedPasswordData === ERRS.INVALID_DECRYPT) {
				this._failDecryptServerResponse();
				return;
			}
			passwordDetailDataStore[passwordDetailDataSymbol] = decryptedPasswordData;

			await this._animateView('selectedView', PasswordDetail._getSelectedViewSize(passwordMeta), () => {
				//This will re-render the DOM so no need to do it because of 
				// selected password change
				this._setSelected();
				this.props.passwordVisible = false;
			});
		} else {
			reportDefaultResponseErrors(response, PaperToast);
			this._showFailedView(this._getPasswordDetails);
		}
	}
	
	private _submitTwofactorCode() {
		const twofactorToken = Array.prototype.slice.apply(<HTMLInputElement[]><any>this
			.$$('.twofactorDigit'))
			.map((el: HTMLInputElement) => {
				return el.value;
			}).join('');
		this._authState.twofactorAuthentication = twofactorToken;
		this._nextView();
	}

	@bindToClass
	public retryRequest() {
		if (this.$.retryButton.getState() === 'loading') {
			return;
		}

		this.$.retryButton.setState('loading');
		this._nextView();
	}

	postRender() {
		const digits = <HTMLInputElement[]><any>this.$$('.twofactorDigit');
		if (digits.length && isNewElement(digits[0])) {
			digits.forEach((digit, index) => {
				listenWithIdentifier(this, digit, `digit${index}`, 'keydown', (e) => {
					if (digit.value.length === 0 && e.keyCode === 8 && index !== 0) {
						//Select previous one
						digits[index - 1].focus();
					}

					if (digit.value.length === 1) {
						if (index === digits.length - 1) {
							//Last one, submit it
							this._submitTwofactorCode();
						} else {
							//Select next one
							digits[index + 1].focus();
							
							if (index === digits.length - 2) {
								wait(50).then(() => {
									this._submitTwofactorCode();
								});
							}
						}
					}
				});
			});
		}
	}
}