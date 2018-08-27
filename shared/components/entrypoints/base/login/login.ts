/// <reference path="../../../../types/elements.d.ts" />
import { defineProps, PROP_TYPE, isDefined, isNewElement, getCookie, listenIfNew } from '../../../../lib/webcomponent-util'
import { HorizontalCenterer } from '../../../util/horizontal-centerer/horizontal-centerer';
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { ThemeSelector } from '../../../util/theme-selector/theme-selector';
import { MaterialInput } from '../../../util/material-input/material-input';
import { LoginData, VALID_THEMES_T } from '../../../../types/shared-types';
import { ConfigurableWebComponent } from "../../../../lib/webcomponents";
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { IconButton } from '../../../util/icon-button/icon-button';
import { bindToClass } from '../../../../lib/decorators';
import { JSONResponse } from '../../../../types/api';
import { LoginIDMap } from './login-querymap';

export const LoginDependencies = [
	VerticalCenterer, 
	HorizontalCenterer, 
	MaterialInput,
	IconButton,
	AnimatedButton,
	ThemeSelector,
	PaperToast
];
export abstract class Login extends ConfigurableWebComponent<LoginIDMap> {
	props = defineProps(this, {
		priv: {
			emailRemembered: PROP_TYPE.BOOL
		}
	});

	layoutMounted() {
		if (!this.getRoot().getAttribute('prop_theme')) {
			//This is a non-server-served page
			const currentTheme = this._globalProperties.theme;
			const cookieTheme = getCookie('theme');
			if (cookieTheme && cookieTheme !== currentTheme) {
				this.setGlobalProperty('theme', cookieTheme as VALID_THEMES_T);
			}
		}
	}

	mounted() {
		if (!this.getRoot().getAttribute('prop_theme')) {
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

	abstract onLogin(): void;
	
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
		console.log('YOOOO');
		const wasEnabled = this.props.emailRemembered;
		this.props.emailRemembered = !wasEnabled;
		if (wasEnabled) {
			//Now disabled
			localStorage.removeItem('rememberedEmail');
		} else {
			localStorage.setItem('rememberedEmail', '');
		}
	}

	protected _getInputData() {
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
			this.onLogin();
		}
	}

	postRender() {
		listenIfNew(this, 'button', 'click', this.onLogin);
		listenIfNew(this, 'lockButton', 'click', this.handleEmailRememberToggle);
		for (const input of [this.$.emailInput, this.$.passwordInput, this.$.twofactorInput]) {
			if (isNewElement(input)) {
				input.listen('valid', this._updateValidity);
				input.listen('keydown', this._onSubmit)
			}
		}
	}
}