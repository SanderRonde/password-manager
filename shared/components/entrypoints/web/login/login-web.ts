import { genRSAKeyPair, encryptWithPublicKey, hash, pad, decryptWithPrivateKey } from '../../../../lib/browser-crypto';
import { config, cancelTimeout, wait, createCancellableTimeout, setCookie } from '../../../../lib/webcomponent-util';
import { HorizontalCenterer } from '../../../util/horizontal-centerer/horizontal-centerer';
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { MaterialInput } from '../../../util/material-input/material-input';
import { ThemeSelector } from '../../../util/theme-selector/theme-selector';
import { IconButton } from '../../../util/icon-button/icon-button';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { doClientAPIRequest } from '../../../../lib/apirequests';
import { API_ERRS, APIReturns } from '../../../../types/api';
import { bindToClass } from '../../../../lib/decorators';
import { LoginHTML } from '../../base/login/login.html';
import { LoginCSS } from '../../base/login/login.css';
import { Login } from '../../base/login/login';

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
		ThemeSelector,
		PaperToast
	]
})
export class LoginWeb extends Login {
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
			PaperToast.create({
				content: 'Could not establish connection to server',
				buttons: [PaperToast.BUTTONS.HIDE]
			});
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
			const res = {
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
			};
			if (res.response.success === false) {
				switch (res.response.ERR) {
					case API_ERRS.CLIENT_ERR:
						PaperToast.create({
							content: 'Failed to send request',
							buttons: [PaperToast.BUTTONS.HIDE]
						});
						break;
					case API_ERRS.INVALID_CREDENTIALS:
						PaperToast.create({
							content: 'Invalid credentials',
							buttons: [PaperToast.BUTTONS.HIDE]
						});
						break;
					case API_ERRS.INVALID_PARAM_TYPES:
					case API_ERRS.MISSING_PARAMS:
					case API_ERRS.NO_REQUEST_BODY:
						PaperToast.create({
							content: 'Invalid request',
							buttons: [PaperToast.BUTTONS.HIDE]
						});
						break;
					case API_ERRS.SERVER_ERROR:
						PaperToast.create({
							content: 'Server error',
							buttons: [PaperToast.BUTTONS.HIDE]
						});
						break;
					case API_ERRS.TOO_MANY_REQUESTS:
						PaperToast.create({
							content: 'Too many requests',
							buttons: [PaperToast.BUTTONS.HIDE]
						});
						break;
				}
			}
			return res;
		} catch(e) {
			PaperToast.create({
				content: 'Could not establish connection to server',
				buttons: [PaperToast.BUTTONS.HIDE]
			});
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
				response.data.server_public_key, privateKey),
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

	@bindToClass
	async onLogin() {
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
			PaperToast.create({
				content: 'Loading dashboard...',
				duration: PaperToast.DURATION.FOREVER,
				buttons: [PaperToast.BUTTONS.HIDE]
			});
			await this._proceedToDashboard({ privateKey, response });
		} else {
			this.$.button.setState('failure');
			createCancellableTimeout(this, 'failure-button', () => {
				this.$.button.setState('regular');
			}, 3000);
		}
	}
}