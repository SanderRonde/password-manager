/// <reference path="../../../../types/elements.d.ts" />
import { defineProps, PROP_TYPE, isDefined, config, listen, isNewElement, createCancellableTimeout, cancelTimeout, wait, setCookie, getCookie } from '../../../../lib/webcomponent-util'
import { genRSAKeyPair, encryptWithPublicKey, hash, pad, decryptWithPrivateKey } from '../../../../lib/browser-crypto';
import { HorizontalCenterer } from '../../../util/horizontal-centerer/horizontal-centerer';
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { MaterialInput } from '../../../util/material-input/material-input';
import { ThemeSelector } from '../../../util/theme-selector/theme-selector';
import { LoginData, VALID_THEMES_T } from '../../../../types/shared-types';
import { ConfigurableWebComponent } from "../../../../lib/webcomponents";
import { IconButton } from '../../../util/icon-button/icon-button';
import { doClientAPIRequest } from '../../../../lib/apirequests';
import { API_ERRS, APIReturns, JSONResponse } from '../../../../types/api';
import { bindToClass } from '../../../../lib/decorators';
import { LoginIDMap } from './login-querymap';
import { LoginHTML } from './login.html';
import { LoginCSS } from './login.css';

type ServerLoginResponse = APIReturns['/api/dashboard/login'];

@config({
	is: 'login-page',
	css: LoginCSS,
	html: LoginHTML,
	dependencies: [
		VerticalCenterer, 
		HorizontalCenterer, 
		MaterialInput,
		IconButton,
		AnimatedButton,
		ThemeSelector
	]
})
export class Login extends ConfigurableWebComponent<LoginIDMap> {
	props = defineProps(this, {
		priv: {
			emailRemembered: PROP_TYPE.BOOL
		}
	});

	constructor() {
		super();

		if (!this.getAttribute('prop_theme')) {
			//This is a non-server-served page
			const currentTheme = this._globalProperties.theme;
			const cookieTheme = getCookie('theme');
			if (cookieTheme && cookieTheme !== currentTheme) {
				this.setGlobalProperty('theme', cookieTheme as VALID_THEMES_T);
			}

			this._fetchData();
		}
	}

	private _fetchData() {
		//Try to get the data now
		return new Promise((resolve, reject) => {
			fetch('/api/dashboard/get_comm', {
				method: 'POST'
			}).then((res) => {
				return res.json();
			}).then((data: JSONResponse<{
				comm_token: string;
				server_public_key: string;	
			}>) => {
				if (!data.success) return;
				this.setGlobalProperty('comm_token', data.data.comm_token);
				this.setGlobalProperty('server_public_key', data.data.server_public_key);
				resolve();
			}).catch(reject);
		});
	}

	async getData(): Promise<LoginData|null> {
		if (this._globalProperties.page !== 'login') {
			throw new Error('Failed to get login data');
		}

		if (!this._globalProperties.comm_token ||
			!this._globalProperties.server_public_key) {
			await this._fetchData().catch(() => {});
			if (!this._globalProperties.comm_token ||
				!this._globalProperties.server_public_key) {
					return null;
				}
		}

		return this._globalProperties as LoginData;
	}

	private async _doLoginRequest({
		email, password, twofactor_token
	}: {
		valid: boolean;
		email: string;
		password: string;
		twofactor_token: string|null;
	}): Promise<{
		privateKey: string|null;
		response: ServerLoginResponse
	}> {
		const serverData = await this.getData();
		if (serverData === null) {
			return {
				privateKey: null,
				response: {
					success: false,
					ERR: API_ERRS.NO_REQUEST_BODY,
					error: 'no data provided by server on page load'
				}
			}
		}

		const keyPair = genRSAKeyPair();
		localStorage.setItem('instance_private_key', keyPair.privateKey);
		localStorage.setItem('instance_public_key', keyPair.publicKey);

		const { comm_token, server_public_key } = serverData;
		try {
			return {
				privateKey: keyPair.privateKey,
				response: await doClientAPIRequest({},
					'/api/dashboard/login', {
						comm_token,
						public_key: keyPair.publicKey,
						encrypted_data: encryptWithPublicKey({
							email: email,
							twofactor_token: twofactor_token || undefined,
							password: hash(pad(password, 'masterpwverify')),
						}, server_public_key)
					})
			}
		} catch(e) {
			return {
				privateKey: keyPair.privateKey,
				response: {
					success: false,
					ERR: API_ERRS.CLIENT_ERR,
					error: 'failed to complete request'
				}
			}
		}
	}

	private async _proceedToDashboard({
		privateKey, response	
	}: {
		privateKey: string;
		response: ServerLoginResponse
	}) {
		if (!response.success) return;

		//Decrypt data
		const {
			instance_id, server_public_key, auth_token
		} = {
			instance_id: decryptWithPrivateKey(
				response.data.id, privateKey),
			server_public_key: decryptWithPrivateKey(
				response.data.server_key, privateKey),
			auth_token: decryptWithPrivateKey(
				response.data.auth_token, privateKey)
		}

		//Set localstorage
		localStorage.setItem('server_public_key', server_public_key);

		//Set cookies
		setCookie('login_auth', auth_token, 1000 * 60 * 18);
		setCookie('instance_id', instance_id, 1000 * 60 * 60 * 24);
		
		//Do navigation
		location.href = '/dashboard';
	}

	private _getInputData() {
		const email = this.$.emailInput.value;
		const password = this.$.passwordInput.value;
		const twofactor = this.$.twofactorInput.value;
		
		if (!this.$.emailInput.valid || 
			!this.$.passwordInput.valid ||
			!this.$.twofactorInput.valid) {
				return {
					valid: false,
					email: '', password: '', twofactor_token: ''
				}
			} else {	
				return {
					valid: true,
					email: email!, 
					password: password!,
					twofactor_token: twofactor
				}
			}
	}

	@bindToClass
	async login() {
		const inputData = this._getInputData();
		if (inputData.valid === false || this.$.button.getState() === 'loading') {
			//Just do nothing
			return;
		}
	
		cancelTimeout(this, 'failure-button');
		this.$.button.setState('loading');

		//Wait for the ripple animation to clear before doing heavy work
		await wait(300);
		const { privateKey, response } = await this._doLoginRequest(inputData);	

		if (response.success && privateKey) {
			if (this.props.emailRemembered) {
				const email = this.$.emailInput.value;
				localStorage.setItem('rememberedEmail', email || '');
			}
			this.$.button.setState('success');
			await this._proceedToDashboard({ privateKey, response });
		} else {
			this.$.button.setState('failure');
			createCancellableTimeout(this, 'failure-button', () => {
				this.$.button.setState('regular');
			}, 3000);
		}
	}
	
	firstRender() {
		const inputValue = localStorage.getItem('rememberedEmail')
		if (isDefined(inputValue)) {
			this.props.emailRemembered = true;
			this.$.passwordInput.input.focus();
			this.$.emailInput.set(inputValue);
		} else {
			this.props.emailRemembered = false;
			this.$.emailInput.input.focus();
		}
	}

	@bindToClass
	handleEmailRememberToggle() {
		const wasEnabled = this.props.emailRemembered;
		this.props.emailRemembered = !wasEnabled;
		if (wasEnabled) {
			//Now disabled
			localStorage.removeItem('rememberedEmail');
		} else {
			localStorage.setItem('rememberedEmail', '');
		}
	}

	@bindToClass
	private _updateValidity() {
		if (this._getInputData().valid) {
			this.$.button.enable();
		} else {
			this.$.button.disable();
		}
	}

	@bindToClass
	private _onSubmit(e: KeyboardEvent) {
		//Enter
		if (e.keyCode === 13 && this._getInputData().valid) {
			this.login();
		}
	}

	postRender() {
		listen(this.$.button, 'click', this.login);
		listen(this.$.lockButton, 'click', this.handleEmailRememberToggle);
		for (const input of [this.$.emailInput, this.$.passwordInput, this.$.twofactorInput]) {
			if (isNewElement(input)) {
				input.listen('valid', this._updateValidity);
				input.listen('keydown', this._onSubmit)
			}
		}
	}
}