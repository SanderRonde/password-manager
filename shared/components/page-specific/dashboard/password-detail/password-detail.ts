/// <reference path="../../../../types/elements.d.ts" />

import { config, defineProps, ComplexType, wait, isNewElement, listenWithIdentifier, reportDefaultResponseErrors, listenIfNew } from '../../../../lib/webcomponent-util';
import { PasswordDetailHTML, passwordDetailDataStore, passwordDetailDataSymbol } from './password-detail.html';
import { StringifiedObjectId, EncryptedInstance, ServerPublicKey } from '../../../../types/db-types';
import { PasswordDetailCSS, VIEW_FADE_TIME, STATIC_VIEW_HEIGHT } from './password-detail.css';
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { decryptWithPrivateKey, decrypt } from '../../../../lib/browser-crypto';
import { LoadingSpinner } from '../../../util/loading-spinner/loading-spinner';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { MetaPasswords } from '../../../entrypoints/base/dashboard/dashboard';
import { MaterialInput } from '../../../util/material-input/material-input';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { SizingBlock } from '../../../util/sizing-block/sizing-block';
import { IconButton } from '../../../util/icon-button/icon-button';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { PasswordDetailIDMap } from './password-detail-querymap';
import { doClientAPIRequest } from '../../../../lib/apirequests';
import { ENTRYPOINT } from '../../../../types/shared-types';
import { APIToken, ERRS } from '../../../../types/crypto';
import { U2FSignResponse } from 'u2f';

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
		LoadingSpinner
	]
})
export class PasswordDetail extends ConfigurableWebComponent<PasswordDetailIDMap> {
	props = defineProps(this, {
		priv: {
			selected: ComplexType<MetaPasswords[0]>(),
			addedWebsites: {
				type: ComplexType<MetaPasswords[0]['websites']>(),
				value: []
			},
			authData: ComplexType<PasswordDetailData>()
		}
	});

	private _authState: {
		u2fAuthenticated: null|U2FSignResponse;
		twofactorAuthentication: null|string;
	} = {
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

	private _getSelectedViewSize(password: MetaPasswords[0]) {
		return 500 + (password.websites.length * 200);
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
				u2fAuthenticated: null,
				twofactorAuthentication: null
			};

			this._getPasswordDetails(newValue);
		} else if (oldValue !== null) {
			await this._animateView('noneSelectedView', STATIC_VIEW_HEIGHT, () => {
				this.props.addedWebsites = [];
			});
		}
	}

	private _tryParse<T>(data: EncodedString<T>): {
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
			await this._animateView('u2fRequiredView', STATIC_VIEW_HEIGHT);
			return;
		}

		//Do the request
		const clientPublicKey = localStorage.getItem('instance_public_key');
		const clientPrivateKey = localStorage.getItem('instance_private_key');

		if ((!clientPublicKey || !clientPrivateKey) && !document.body.classList.contains('dev')) {
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

		const [ , response ] = await Promise.all([
			this._animateView('loadingView', STATIC_VIEW_HEIGHT),
			doClientAPIRequest({
				publicKey: this.props.authData.server_public_key
			}, '/api/password/get', {
				instance_id: this.props.authData.instance_id
			},  {
				token: this.getRoot().getAPIToken(),
				password_id: this.props.selected.id,
				count: this.getRoot().getRequestCount(),
			})
		]);
		if (response.success) {
			//Decrypt with public key
			const publicKeyDecrypted = decryptWithPrivateKey(response.data.encrypted,
				clientPrivateKey || (document.body.classList.contains('dev') ?
					(response.data as any).privateKey : clientPrivateKey));
			if (publicKeyDecrypted === ERRS.INVALID_DECRYPT) {
				this._failDecryptServerResponse();
				return;
			}

			const parseResult = this._tryParse(publicKeyDecrypted);
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

			await this._animateView('selectedView', this._getSelectedViewSize(passwordMeta), () => {
				//This will re-render the DOM so no need to do it because of 
				// selected password change
				this.props.addedWebsites = [];
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

	private _retryRequest() {
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
						}
					}
				});
			});
		}

		listenIfNew(this, 'retryButton', 'click', () => {
			this._retryRequest();
		});
	}
}