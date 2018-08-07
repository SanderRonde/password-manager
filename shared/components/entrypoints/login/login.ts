/// <reference path="../../../types/elements.d.ts" />
import { defineProps, PROP_TYPE, isDefined, ConfigurableWebComponent, config, listen, isNewElement } from '../../../lib/webcomponent-util'
import { genRSAKeyPair, encryptWithPublicKey, hash, pad } from '../../../lib/browser-crypto';
import { HorizontalCenterer } from '../../util/horizontal-centerer/horizontal-centerer';
import { VerticalCenterer } from '../../util/vertical-centerer/vertical-centerer';
import { AnimatedButton } from '../../util/animated-button/animated-button';
import { MaterialInput } from '../../util/material-input/material-input';
import { IconButton } from '../../util/icon-button/icon-button';
import { doClientAPIRequest } from '../../../lib/apirequests';
import { API_ERRS, APIReturns } from '../../../types/api';
import { LoginData } from '../../../types/shared-types';
import { bindToClass } from '../../../lib/decorators';
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
		AnimatedButton
	]
})
export class Login extends ConfigurableWebComponent<LoginIDMap> {
	props = defineProps(this, {
		priv: {
			emailRemembered: PROP_TYPE.BOOL
		}
	});

	getData(): LoginData {
		return JSON.parse(document.getElementById('data')!.innerText);
	}

	private async _doLoginRequest({
		email, password, twofactor_token
	}: {
		valid: boolean;
		email: string;
		password: string;
		twofactor_token: string|null;
	}): Promise<ServerLoginResponse> {
		const serverData = this.getData();
		if (serverData === null) {
			return {
				success: false,
				ERR: API_ERRS.NO_REQUEST_BODY,
				error: 'no data provided by server on page load'
			}
		}

		const keyPair = genRSAKeyPair();
		localStorage.setItem('instance_private_key', keyPair.privateKey);
		localStorage.setItem('instance_public_key', keyPair.publicKey);

		const { comm_token, server_public_key } = serverData;
		return await doClientAPIRequest({},
			'/api/dashboard/login', {
				comm_token,
				public_key: keyPair.publicKey,
				encrypted: encryptWithPublicKey({
					email: email,
					twofactor_token: twofactor_token || undefined,
					password: hash(pad(password, 'masterpwverify')),
				}, server_public_key)
			});
	}

	private async _proceedToDashboard(_serverResponse: ServerLoginResponse) {
		alert('Proceeding to dashboard');
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
		if (inputData.valid === false) {
			//Just do nothing
			return;
		}
	
		this.$.button.setState('loading');
		const result = await this._doLoginRequest(inputData);	

		if (result.success) {
			if (this.props.emailRemembered) {
				const email = this.$.emailInput.value;
				localStorage.setItem('rememberedEmail', email || '');
			}
			this.$.button.setState('success');
			await this._proceedToDashboard(result);
		} else {
			this.$.button.setState('failure');
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

	postRender() {
		listen(this.$.lockButton, 'click', this.handleEmailRememberToggle);
		if (isNewElement(this.$.emailInput)) {
			this.$.emailInput.addValidityListener(this._updateValidity);
		}
		if (isNewElement(this.$.passwordInput)) {
			this.$.passwordInput.addValidityListener(this._updateValidity);
		}
		if (isNewElement(this.$.twofactorInput)) {
			this.$.twofactorInput.addValidityListener(this._updateValidity);
		}
	}
}