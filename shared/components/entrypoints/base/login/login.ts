/// <reference path="../../../../types/elements.d.ts" />
import { LoginData, VALID_THEMES_T, GlobalProperties, ENTRYPOINT } from '../../../../types/shared-types';
import { HorizontalCenterer } from '../../../util/horizontal-centerer/horizontal-centerer';
import { ConfigurableWebComponent, Props, PROP_TYPE } from "../../../../lib/webcomponents";
import { VerticalCenterer } from '../../../util/vertical-centerer/vertical-centerer';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { isDefined, getCookie, wait } from '../../../../lib/webcomponent-util'
import { ThemeSelector } from '../../../util/theme-selector/theme-selector';
import { MaterialInput } from '../../../util/material-input/material-input';
import { PaperDialog } from '../../../util/paper-dialog/paper-dialog';
import { PaperButton } from '../../../util/paper-button/paper-button';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { IconButton } from '../../../util/icon-button/icon-button';
import { GlobalController } from '../global/global-controller';
import { bindToClass } from '../../../../lib/decorators';
import { MDCard } from '../../../util/md-card/md-card';
import { JSONResponse } from '../../../../types/api';
import { LoginIDMap } from './login-querymap';
import { DIALOG_FADE_TIME, KEY_TURN_TIME, SPLIT_TIME } from './login.css';
import { awaitMounted } from '../../../../lib/webcomponents/template-util';
import { ANIMATE_TIME } from '../../../util/loadable-block/loadable-block.css';

export const LoginDependencies = [
	VerticalCenterer, 
	HorizontalCenterer, 
	MaterialInput,
	IconButton,
	AnimatedButton,
	ThemeSelector,
	PaperToast,
	MDCard,
	PaperDialog,
	PaperButton
];
export abstract class Login extends ConfigurableWebComponent<LoginIDMap> {
	props = Props.define(this, {
		priv: {
			emailRemembered: PROP_TYPE.BOOL
		}
	});

	layoutMounted() {
		if (!this.getRoot<GlobalController>().getAttribute('prop_theme')) {
			//This is a non-server-served page
			const currentTheme = this.globalProps<GlobalProperties>().get('theme');
			const cookieTheme = getCookie('theme');
			if (cookieTheme && cookieTheme !== currentTheme) {
				this.globalProps<GlobalProperties>().set('theme', cookieTheme as VALID_THEMES_T);
			}
		}
	}

	mounted() {
		if (!this.getRoot<GlobalController>().getAttribute('prop_theme')) {
			this._fetchData();
		}
		if (document.body.classList.contains('dev')) {
			this.$.emailInput.set('some@email.com');
			this.$.passwordInput.set('defaultpassword');
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
				this.globalProps<GlobalProperties>().set('comm_token', data.data.comm_token);
				this.globalProps<GlobalProperties>().set('server_public_key', data.data.server_public_key);
				resolve();
			}).catch(reject);
		});
	}

	async getData(): Promise<LoginData|null> {
		if (this.globalProps<GlobalProperties>().get('page') !== 'login') {
			throw new Error('Failed to get login data');
		}

		if (!this.globalProps<GlobalProperties>().get('comm_token') ||
			!this.globalProps<GlobalProperties>().get('server_public_key')) {
			await this._fetchData().catch(() => {});
			if (!this.globalProps<GlobalProperties>().get('comm_token') ||
				!this.globalProps<GlobalProperties>().get('server_public_key')) {
					return null;
				}
		}

		return this.globalProps<GlobalProperties>().all as LoginData;
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
					email: email!.trim(), 
					password: password!.trim(),
					twofactor_token: twofactor.trim()
				}
			}
	}

	public async onLoginSuccess() {
		const root = this.getRoot<GlobalController>();
		root.loadEntrypoint(ENTRYPOINT.DASHBOARD);
		const dashboardEl = root.addNewPage(ENTRYPOINT.DASHBOARD);
		this.$.lockAnimationContainer.classList.add('changeColor');
		this.$.pageContainer.classList.add('invisible');
		await wait(DIALOG_FADE_TIME);
		this.$.pageContainer.classList.add('hidden');
		await wait(100);

		this.$.lockAnimationKeySlot.classList.add('turned');
		await wait(KEY_TURN_TIME);

		if (dashboardEl.isMounted) {
			dashboardEl.classList.remove('invisible', 'hidden');
		}

		await wait(100);

		this.$.lockAnimationContainer.classList.add('split');

		let splitDone = false;
		awaitMounted(dashboardEl).then(() => {
			if (!splitDone) {
				dashboardEl.classList.remove('invisible', 'hidden');
			}
		});
		await wait(SPLIT_TIME);
		splitDone = true;

		this.$.lockAnimationContainer.classList.add('hidden');

		if (!dashboardEl.isMounted) {
			root.$.loadable.load();
			await Promise.all([
				awaitMounted(dashboardEl),
				wait(ANIMATE_TIME)
			]);
			root.$.loadable.finish();
		}

		root.props.page = ENTRYPOINT.DASHBOARD;
		root.globalProps<GlobalProperties>().set('page', ENTRYPOINT.DASHBOARD);
		root.hideNonCurrent();
		dashboardEl.classList.remove('invisible', 'hidden');
		root.setHistoryState(ENTRYPOINT.DASHBOARD);
	}

	@bindToClass
	public updateValidity() {
		if (this._getInputData().valid) {
			this.$.button.enable();
		} else {
			this.$.button.disable();
		}
	}

	@bindToClass
	public onKeyDown(e: KeyboardEvent) {
		//Enter
		if (e.keyCode === 13 && this._getInputData().valid) {
			this.onLogin();
		}
	}
}