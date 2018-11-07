/// <reference path="../../../../types/elements.d.ts" />

import { APIToken, ERRS, U2FToken, Encrypted, Hashed, Padded, MasterPasswordDecryptionpadding, EncryptionAlgorithm } from '../../../../types/crypto';
import { StringifiedObjectId, EncryptedInstance, ServerPublicKey, PublicKeyDecrypted, MasterPassword } from '../../../../types/db-types';
import { wait, isNewElement, listenWithIdentifier } from '../../../../lib/webcomponent-util';
import { ConfigurableWebComponent, Props, ComplexType } from '../../../../lib/webcomponents';
import { passwordDetailDataStore, passwordDetailDataSymbol } from './password-detail.html';
import { decryptWithPrivateKey, decrypt, encrypt } from '../../../../lib/browser-crypto';
import { MetaPasswords, Dashboard } from '../../../entrypoints/base/dashboard/dashboard';
import { reportDefaultResponseErrors } from '../../../entrypoints/web/login/login-web';
import { createClientAPIRequest, filterUndefined } from '../../../../lib/apirequests';
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { LoadingSpinner } from '../../../util/loading-spinner/loading-spinner';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { MaterialInput } from '../../../util/material-input/material-input';
import { VIEW_FADE_TIME, STATIC_VIEW_HEIGHT } from './password-detail.css';
import { API_ERRS, APISuccessfulReturns } from '../../../../types/api';
import { SizingBlock } from '../../../util/sizing-block/sizing-block';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { PasswordDetailIDMap } from './password-detail-querymap';
import { getHost } from '../password-form/password-form.html';
import { PasswordForm } from '../password-form/password-form';
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

export interface PasswordDetailChanges {
	username: string;
	password: string|null;
	twofactor_secret: string|null;
	notes: string[];
	twofactor_enabled: boolean;
	u2f_enabled: boolean;
	websites: {
		url: string
	}[];
}
export type ToBools<T> = {
	[P in keyof T]: boolean;
};

const enum TWOFACTOR_CHECK_STATE {
	IN_PROGRESS,
	FAILED,
	SUCCEEDED
};

export const PasswordDetailDependencies = [
	SizingBlock,
	VerticalCenterer,
	MaterialInput,
	PaperToast,
	AnimatedButton,
	LoadingSpinner,
	PasswordForm
]
export abstract class PasswordDetail extends ConfigurableWebComponent<PasswordDetailIDMap> {
	props = Props.define(this, {
		priv: {
			selected: ComplexType<MetaPasswords[0]>(),
			visibleWebsites: {
				type: ComplexType<MetaPasswords[0]['websites']>(),
				value: []
			},
			authData: ComplexType<PasswordDetailData>(),
			ref: ComplexType<Dashboard>()
		},
		reflect: {}
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

	public abstract u2fSupported(): boolean;

	constructor() {
		super();

		this.listen('propChange', (name, oldValue, newValue) => {
			if (name === 'selected') {
				this._selectedChange(oldValue, newValue);
			}
		});
	}

	private async _check2faChanges(newData: PasswordDetailChanges,
		changed: ToBools<PasswordDetailChanges>, callback: (success: boolean) => void) {
			//Check if it's set up
			const request = createClientAPIRequest({
				publicKey: this.props.authData.server_public_key
			}, '/api/instance/2fa/is_setup', {
				instance_id: this.props.authData.instance_id
			}, {
				token: this.getRoot().getAPIToken(),
				count: this.getRoot().getRequestCount()
			});
			const requestProm = request.fn();
			await this._quickAnimateSelected(requestProm);
			const response = await requestProm;
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
						this.saveChanges(newData, changed, callback);
					};
					const firstDigit = this.$('#digit0') as HTMLInputElement;
					firstDigit && firstDigit.focus();
					return TWOFACTOR_CHECK_STATE.IN_PROGRESS;
				}
			} else {
				reportDefaultResponseErrors(response);
				return TWOFACTOR_CHECK_STATE.FAILED;
			}
			return TWOFACTOR_CHECK_STATE.SUCCEEDED;
		}

	private async _checkU2fChanges(newData: PasswordDetailChanges,
		changed: ToBools<PasswordDetailChanges>, callback: (success: boolean) => void) {
			if (!changed.u2f_enabled) {
				return;
			}

			if (!this._assertU2f()) {
				this._showFailedView(() => {
					this.saveChanges(newData, changed, callback);
				});
				return;
			}

			//Combine these two requests
			const request = createClientAPIRequest({
				publicKey: this.props.authData.server_public_key
			}, '/api/instance/u2f/gen_request', {
				instance_id: this.props.authData.instance_id
			}, {
				token: this.getRoot().getAPIToken(),
				count: this.getRoot().getRequestCount()
			});
			const requestProm = request.fn();
			await this._quickAnimateSelected(requestProm);
			const response = await requestProm;
			if (response.success) {
				this._signU2FRequest(response.data.request).then(() => {
					this.saveChanges(newData, changed, callback);
				});
				return TWOFACTOR_CHECK_STATE.IN_PROGRESS;
			} else if (response.ERR === API_ERRS.INVALID_CREDENTIALS && 
				response.error === 'U2F not enabled') {
					PaperToast.createHidable('U2F is not set up for this account,' + 
						' applying all non-u2f changes', PaperToast.DURATION.LONG);
				} else {
					reportDefaultResponseErrors(response);
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
				for (const oldWebsite of this.props.selected.websites) {
					if (getHost(website.url) === oldWebsite.host) {
						//Not new
						return false;
					}
				}
				//New
				return true;
			}),
			removed: this.props.selected.websites.filter((website) => {
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

	public async deletePassword(password: MetaPasswords[0]|null) {
		if (!password) return;
		if (password.twofactor_enabled && !this._authState.twofactorAuthentication) {
			await this._animateView('twofactorRequiredView', STATIC_VIEW_HEIGHT, () => {
				this.$$('.twofactorDigit').forEach((el: HTMLInputElement) => {
					el.value = '';
				});
			});
			this._postViewCallback = () => {
				this.deletePassword(password);
			};
			const firstDigit = this.$('#digit0') as HTMLInputElement;
			firstDigit && firstDigit.focus();
		}

		//TODO: confirm deletion
		const request = createClientAPIRequest({
			publicKey: this.props.authData.server_public_key
		}, '/api/password/remove', {
			instance_id: this.props.authData.instance_id
		}, {...{
			//Auth stuff
			token: this.getRoot().getAPIToken(),
			count: this.getRoot().getRequestCount(),
			password_id: password.id,
		}, ...filterUndefined({
			twofactor_token: (password.twofactor_enabled ?
				this._authState.twofactorAuthentication! : undefined)
		})});
		this._authState = {
			u2fToken: null,
			u2fAuthenticated: null,
			twofactorAuthentication: null
		};
		const requestProm = request.fn();
		this._animateView('loadingView', STATIC_VIEW_HEIGHT);
		const response = await requestProm;
		if (response.success) {
			this._animateView('noneSelectedView', STATIC_VIEW_HEIGHT);
			//Remove from list
			this.props.ref.props.metaPasswords = 
				this.props.ref.props.metaPasswords.filter((pw) => {
					return pw.id !== password.id
				});
		} else {
			reportDefaultResponseErrors(response);
			this._showFailedView(() => {
				this.deletePassword(password);
			});
		}
	}

	public async saveChanges(newData: PasswordDetailChanges, 
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
					twofactor_secret: string|null;
					password: string|null;
					notes: string[];
				}>, Hashed<Padded<MasterPassword, MasterPasswordDecryptionpadding>>>;
				algorithm: EncryptionAlgorithm;
			}>|undefined = (!changed.password && !changed.notes) ? undefined : 
				encrypt({
					twofactor_secret: newData.twofactor_secret,
					password: newData.password,
					notes: newData.notes
				}, decryptHash.hash, 'aes-256-ctr');

			//Apply changes
			const request = createClientAPIRequest({
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
			this._authState = {
				u2fToken: null,
				u2fAuthenticated: null,
				twofactorAuthentication: null
			};
			const requestProm = request.fn();
			await this._quickAnimateSelected(requestProm);
			const response = await request;

			if (changed.twofactor_enabled || changed.u2f_enabled ||
				changed.websites || changed.username) {
					//Update preview
					this.props.ref && this.props.ref.fetchMeta();
				}

			return response;
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

	private _deselect() {
		this.$.passwordForm.setSelected(null);
		passwordDetailDataStore[passwordDetailDataSymbol] = null;
	}

	private async _selectedChange(oldValue: MetaPasswords[0]|null, newValue: MetaPasswords[0]|null) {
		if (oldValue && newValue && oldValue.id === newValue.id) {
			//Just a list update, nothing to change
			
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
			this._deselect();
			await this._animateView('noneSelectedView', STATIC_VIEW_HEIGHT);
		} else {
			this._deselect();
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
	
	private _failDecryptServerResponse(retryFn: () => void) {
		PaperToast.createHidable('Failed to decrypt server response',
			PaperToast.DURATION.LONG);
		this._showFailedView(retryFn);
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
					(this.getGlobalProperty('isWeb') === 'true' ? 
						', redirecting to login page...' :
						', please delete this instance and create a new instance to fix it'),
				PaperToast.DURATION.LONG);
			if (this.getGlobalProperty('isWeb') === 'true') {
				this.getRoot().changePage(ENTRYPOINT.LOGIN);
			}
			this._showFailedView(this._signU2F);
			return;
		}

		const usedId = this.props.selected.id;
		const request = createClientAPIRequest({
			publicKey: this.props.authData.server_public_key
		}, '/api/password/getmeta', {
			instance_id: this.props.authData.instance_id
		}, {
			token: this.getRoot().getAPIToken(),
			count: this.getRoot().getRequestCount(),
			password_id: usedId
		});;
		const response = await request.fn();

		if (usedId !== this.props.selected.id) {
			return;
		}

		if (response.success) {
			//Decrypt with public key
			const publicKeyDecrypted = decryptWithPrivateKey(response.data.encrypted,
				clientPrivateKey || (document.body.classList.contains('dev') ?
					(response.data as any).privateKey : clientPrivateKey));
			if (publicKeyDecrypted === ERRS.INVALID_DECRYPT) {
				this._failDecryptServerResponse(this._signU2F);
				return;
			}

			const parseResult = PasswordDetail._tryParse(publicKeyDecrypted);
			if (parseResult.success === false) {
				this._failDecryptServerResponse(this._signU2F);
				return;
			}
			const publicKeyDecryptedParsed = parseResult.data;
			await this._signU2FRequest(publicKeyDecryptedParsed.requests!);
			if (usedId !== this.props.selected.id) {
				return;
			}
			this._nextView();
		} else {
			reportDefaultResponseErrors(response);
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

	private _assertU2f() {
		if (this.u2fSupported()) {
			return true;
		}
		PaperToast.createHidable('U2F is not supported on the dashboard since a ' + 
			'registration is unique to a computer, please register an instance intead');
		return false;
	}

	@bindToClass
	private async _getPasswordDetails(passwordMeta: MetaPasswords[0] = this.props.selected) {
		if (passwordMeta.u2f_enabled && this._authState.u2fAuthenticated === null) {
			if (!this._assertU2f()) {
				this._showFailedView(() => {
					this._getPasswordDetails(passwordMeta);
				});
				return;
			}
			await this._animateView('u2fRequiredView', STATIC_VIEW_HEIGHT, () => {
				this._signU2F();
			});
			this._postViewCallback = this._getPasswordDetails;
			return;
		} else if (passwordMeta.twofactor_enabled && this._authState.twofactorAuthentication === null) {
			await this._animateView('twofactorRequiredView', STATIC_VIEW_HEIGHT, () => {
				this.$$('.twofactorDigit').forEach((el: HTMLInputElement) => {
					el.value = '';
				});
			});
			this._postViewCallback = this._getPasswordDetails;
			const firstDigit = this.$('#digit0') as HTMLInputElement;
			firstDigit && firstDigit.focus();
			return;
		}

		//Do the request
		const clientPrivateKey = localStorage.getItem('instance_private_key');

		if (!clientPrivateKey && !document.body.classList.contains('dev')) {
			PaperToast.createHidable(
				'Failed to set up public and/or private key with server' + 
					(this.getGlobalProperty('isWeb') === 'true' ? 
						', redirecting to login page...' :
						', please delete this instance and create a new instance to fix it'),
				PaperToast.DURATION.LONG);
			if (this.getGlobalProperty('isWeb') === 'true') {
				this.getRoot().changePage(ENTRYPOINT.LOGIN);
			}
			this._showFailedView(this._getPasswordDetails);
			return;
		}

		const request = createClientAPIRequest({
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
		const requestProm = request.fn();

		//Reset authstate
		this._authState = {
			twofactorAuthentication: null,
			u2fAuthenticated: null,
			u2fToken: null
		};
		await this._quickAnimateSelected(requestProm);
		const response = await requestProm;
		if (response.success) {
			//Decrypt with public key
			const publicKeyDecrypted = decryptWithPrivateKey(response.data.encrypted,
				clientPrivateKey || (document.body.classList.contains('dev') ?
					(response.data as any).privateKey : clientPrivateKey));
			if (publicKeyDecrypted === ERRS.INVALID_DECRYPT) {
				this._failDecryptServerResponse(() => {
					this._getPasswordDetails(passwordMeta);
				});
				return;
			}

			const parseResult = PasswordDetail._tryParse(publicKeyDecrypted);
			if (parseResult.success === false) {
				this._failDecryptServerResponse(() => {
					this._getPasswordDetails(passwordMeta);
				});
				return;
			}
			const publicKeyDecryptedParsed = parseResult.data;
			const decryptHash = this.getRoot().getData('decryptHash');
			if (!decryptHash) {
				this._failDecryptServerResponse(() => {
					this._getPasswordDetails(passwordMeta);
				});
				return;
			}
			const decryptedPasswordData = decrypt(publicKeyDecryptedParsed.encrypted, 
				decryptHash.hash);
			if (decryptedPasswordData === ERRS.INVALID_DECRYPT) {
				this._failDecryptServerResponse(() => {
					this._getPasswordDetails(passwordMeta);
				});
				return;
			}
			passwordDetailDataStore[passwordDetailDataSymbol] = decryptedPasswordData;

			await this._animateView('selectedView', 
				this.$.passwordForm.getSelectedViewSize(passwordMeta), () => {
					//This will re-render the DOM so no need to do it because of 
					// selected password change
					this.$.passwordForm.setSelected(this.props.selected);
				});
		} else {
			reportDefaultResponseErrors(response);
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