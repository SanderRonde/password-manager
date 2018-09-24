/// <reference path="../../../../types/elements.d.ts" />

import { config, defineProps, ComplexType, wait, isNewElement, listenWithIdentifier, reportDefaultResponseErrors, findElementInPath, PROP_TYPE } from '../../../../lib/webcomponent-util';
import { PasswordDetailHTML, passwordDetailDataStore, passwordDetailDataSymbol } from './password-detail.html';
import { StringifiedObjectId, EncryptedInstance, ServerPublicKey } from '../../../../types/db-types';
import { PasswordDetailCSS, VIEW_FADE_TIME, STATIC_VIEW_HEIGHT } from './password-detail.css';
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { MaterialCheckbox } from '../../../util/material-checkbox/material-checkbox';
import { doClientAPIRequest, filterUndefined } from '../../../../lib/apirequests';
import { decryptWithPrivateKey, decrypt } from '../../../../lib/browser-crypto';
import { LoadingSpinner } from '../../../util/loading-spinner/loading-spinner';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { MetaPasswords } from '../../../entrypoints/base/dashboard/dashboard';
import { MaterialInput } from '../../../util/material-input/material-input';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { SizingBlock } from '../../../util/sizing-block/sizing-block';
import { APIToken, ERRS, U2FToken } from '../../../../types/crypto';
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
			passwordVisible: PROP_TYPE.BOOL
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

	constructor() {
		super();

		this.listen('propChange', (name, oldValue, newValue) => {
			if (name === 'selected') {
				this._selectedChange(oldValue, newValue);
			}
		});
	}

	private async _sizeChange(websites: MetaPasswords[0]['websites']) {	
		await this.$.sizer.setSize(PasswordDetail._getSelectedViewSize(
			this.props.selectedDisplayed, websites));
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
				duration: 2500
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
				duration: 2500
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
			duration: 2500
		});
		this._copyMap.set(input, window.setTimeout(() => {
			input.classList.remove('done');
		}, 2500));
	}

	@bindToClass
	public onToggleShowPasswordClick() {
		this.props.passwordVisible = !this.props.passwordVisible;
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
		PaperToast.create({
			content: 'Last website can\'t be removed',
			duration: 3500,
			buttons: [PaperToast.BUTTONS.HIDE]
		});
	}

	@bindToClass
	public async removeWebsite(e: MouseEvent & {
		path: HTMLElement[];
	}) {
		const container = findElementInPath(e.path, '.passwordWebsite');
		const index = container && container.getAttribute('data-index');
		if (!container || !index) {
			PaperToast.create({
				content: 'Failed to remove website',
				duration: 3500,
				buttons: [PaperToast.BUTTONS.HIDE]
			});
			return;
		}

		const newWebsites = [...this.props.visibleWebsites.slice(0, -1)];
		this.props.visibleWebsites.splice(~~index, 1);
		await this._sizeChange(newWebsites);
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

	private async _showFailedView() {
		await this._animateView('failedView', STATIC_VIEW_HEIGHT, () => {
			//Reset auth state
			this._authState.twofactorAuthentication = null;
			this._authState.u2fAuthenticated = null;
			this.$.retryButton.setState('regular');
		});
	}
	
	private _failDecryptServerResponse() {
		PaperToast.create({
			content: 'Failed to decrypt server response',
			buttons: [PaperToast.BUTTONS.HIDE],
			duration: 10000
		});
		this._showFailedView();
	}
	
	private async _signU2F() {
		const supported = await isSupported();
		if (!supported) {
			PaperToast.create({
				content: 'U2F is not supported in your browser',
				duration: 10000,
				buttons: [PaperToast.BUTTONS.HIDE]
			});
			this._showFailedView();
			return;
		}

		if (!this.props.authData.server_public_key || 
			!this.props.authData.instance_id) {
				PaperToast.create({
					content: 'Failed to set up public and/or private key with server',
					duration: 10000,
					buttons: [PaperToast.BUTTONS.HIDE]
				});
				this._showFailedView();
				return;
			}

		//Do the request
		const clientPrivateKey = localStorage.getItem('instance_private_key');

		if (!clientPrivateKey && !document.body.classList.contains('dev')) {
			PaperToast.create({
				content: 'Failed to set up public and/or private key with server' + 
					(this._globalProperties.isWeb === 'true' ? 
						', redirecting to login page...' :
						', please delete this instance and create a new instance to fix it'),
				buttons: [PaperToast.BUTTONS.HIDE],
				duration: 10000
			});
			if (this._globalProperties.isWeb === 'true') {
				this.getRoot().changePage(ENTRYPOINT.LOGIN);
			}
			this._showFailedView();
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
			const { signed, request } = await Promise.race([
				new Promise<{
					signed: U2FSignResponse;
					request: U2FToken;
				}>((resolve) => {
					sign(publicKeyDecryptedParsed.requests!.main.request).then((signed) => {
						resolve({
							signed: signed as any,
							request: publicKeyDecryptedParsed.requests!.main.u2f_token
						});
					});
				}),
				new Promise<{
					signed: U2FSignResponse;
					request: U2FToken;
				}>((resolve) => {
					sign(publicKeyDecryptedParsed.requests!.backup.request).then((signed) => {
						resolve({
							signed: signed as any,
							request: publicKeyDecryptedParsed.requests!.backup.u2f_token
						});
					});
				})
			]);
			
			if (usedId !== this.props.selected.id) {
				return;
			}
			this._authState.u2fAuthenticated = signed;
			this._authState.u2fToken = request;
			this._getPasswordDetails();
		} else {
			reportDefaultResponseErrors(response, PaperToast);
			this._showFailedView();
		}
	}

	private async _getPasswordDetails(passwordMeta: MetaPasswords[0] = this.props.selected) {
		if (passwordMeta.twofactor_enabled && this._authState.twofactorAuthentication === null) {
			await this._animateView('twofactorRequiredView', STATIC_VIEW_HEIGHT, () => {
				this.$$('.twofactorDigit').forEach((el: HTMLInputElement) => {
					el.value = '';
				});
			});
			const firstDigit = this.$('#digit0') as HTMLInputElement;
			firstDigit && firstDigit.focus();
			return;
		} else if (passwordMeta.u2f_enabled && this._authState.u2fAuthenticated === null) {
			await this._animateView('u2fRequiredView', STATIC_VIEW_HEIGHT, () => {
				this._signU2F();
			});
			return;
		}

		//Do the request
		const clientPrivateKey = localStorage.getItem('instance_private_key');

		if (!clientPrivateKey && !document.body.classList.contains('dev')) {
			PaperToast.create({
				content: 'Failed to set up public and/or private key with server' + 
					(this._globalProperties.isWeb === 'true' ? 
						', redirecting to login page...' :
						', please delete this instance and create a new instance to fix it'),
				buttons: [PaperToast.BUTTONS.HIDE],
				duration: 10000
			});
			if (this._globalProperties.isWeb === 'true') {
				this.getRoot().changePage(ENTRYPOINT.LOGIN);
			}
			this._showFailedView();
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
		if (this.$.selectedView.classList.contains('visible')) {
			this.$.selectedView.classList.add('quickAnimate');

			//Hide it for now
			this.$.selectedView.classList.remove('visible');

			const resolved = await Promise.race([
				request, wait(MIN_LOADING_TIME)
			]);

			//Show it again
			this.$.selectedView.classList.add('visible');
			this.$.selectedView.classList.remove('quickAnimate');

			if (!resolved) {
				//Wait resolved, not the request, show loading view
				await Promise.all([
					this._animateView('loadingView', STATIC_VIEW_HEIGHT),
					request
				]);
			}
		} else {
			await Promise.all([
				this._animateView('loadingView', STATIC_VIEW_HEIGHT),
				request
			]);
		}
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
			this._showFailedView();
		}
	}
	
	private _submitTwofactorCode() {
		const twofactorToken = Array.prototype.slice.apply(<HTMLInputElement[]><any>this
			.$$('.twofactorDigit'))
			.map((el: HTMLInputElement) => {
				return el.value;
			}).join('');
		this._authState.twofactorAuthentication = twofactorToken;
		this._getPasswordDetails();
	}

	@bindToClass
	public retryRequest() {
		if (this.$.retryButton.getState() === 'loading') {
			return;
		}

		this.$.retryButton.setState('loading');
		this._getPasswordDetails();
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