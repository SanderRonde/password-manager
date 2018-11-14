import { ConfigurableWebComponent, config, Props, ComplexType, PROP_TYPE } from '../../../../lib/webcomponents';
import { passwordDetailDataStore, passwordDetailDataSymbol } from '../password-detail/password-detail.html';
import { PasswordDetail, PasswordDetailChanges, ToBools, ShowHidableView } from '../password-detail/password-detail';
import { FloatingActionButton } from '../../../util/floating-action-button/floating-action-button';
import { createCancellableTimeout } from '../../../../lib/webcomponents/template-util';
import { MaterialCheckbox } from '../../../util/material-checkbox/material-checkbox';
import { MetaPasswords } from '../../../entrypoints/base/dashboard/dashboard';
import { findElementInPath, wait } from '../../../../lib/webcomponent-util';
import { MaterialInput } from '../../../util/material-input/material-input';
import { PaperToast } from '../../../util/paper-toast/paper-toast';
import { IconButton } from '../../../util/icon-button/icon-button';
import { MoreInfo } from '../../../util/more-info/more-info';
import { PasswordFormIDMap } from './password-form-querymap';
import { bindToClass } from '../../../../lib/decorators';
import { PasswordFormHTML } from './password-form.html';
import { PasswordFormCSS } from './password-form.css';
import { totp } from '../../../../lib/browser-crypto';

@config({
	is: 'password-form',
	html: PasswordFormHTML,
	css: PasswordFormCSS,
	dependencies: [
		MaterialCheckbox,
		MoreInfo,
		IconButton,
		FloatingActionButton
	]
})
export class PasswordForm extends ConfigurableWebComponent<PasswordFormIDMap> {
	props = Props.define(this, {
		priv: {
			visibleWebsites: {
				type: ComplexType<MetaPasswords[0]['websites']>(),
				value: []
			},
			parent: ComplexType<PasswordDetail>(),
			passwordVisible: PROP_TYPE.BOOL,
			selectedDisplayed: ComplexType<MetaPasswords[0]|null>()
		},
		reflect: {
			editing: {
				type: PROP_TYPE.BOOL,
				value: false
			}
		}
	});

	constructor() {
		super();
		this.listen('propChange', (name, _from, to) => {
			if (name === 'editing') {
				this._sizeChange();

				if (to) {
					//Now editing
					if (passwordDetailDataStore[passwordDetailDataSymbol]!.twofactor_secret) {
						this.$.twofactorToken.set(passwordDetailDataStore[passwordDetailDataSymbol]!.twofactor_secret!);
					}
					this._shouldRefresh2FA = true;
				} else {
					//Exiting edit mode
					this._shouldRefresh2FA = false;
				}
			}
		});

		const timeStepMS = PasswordForm.TWOFACTOR_TIME_STEP * 1000;
		window.setTimeout(() => {
			window.setInterval(this._refresh2FA, timeStepMS);
		}, timeStepMS - (Date.now() % timeStepMS));
	}

	private static readonly TWOFACTOR_TIME_STEP = 30; //Seconds
	private _shouldRefresh2FA: boolean = true;

	public async enableEditing() {
		this.hideFAB();
		await wait(220);
		this.props.editing = true;
	}

	@bindToClass
	private async _refresh2FA() {		
		const secretContainer = passwordDetailDataStore[passwordDetailDataSymbol];
		if (!secretContainer) return;
		const secret = secretContainer.twofactor_secret;
		if (!this._shouldRefresh2FA || !secret) {
			return;
		}
		this.$.twofactorToken.set(await totp({
			secret: secret!,
			step: PasswordForm.TWOFACTOR_TIME_STEP
		}));
	}

	private _force2FATokenGeneration() {
		this._refresh2FA();
	}

	public refresh() {
		if (this.props.editing) {
			this.showFAB();
		}
		this.props.editing = false;
		this.props.passwordVisible = true;
	}

	private _copyMap: WeakMap<HTMLElement, number> = new WeakMap();

	private _copyText(text: string) {
		const el = document.createElement('textarea');  
		el.value = text;                                
		el.style.position = 'absolute';                
		el.style.left = '-9999px';                      
		document.body.appendChild(el);                  
	
		const selected = !document.getSelection() ? false :
			document.getSelection()!.rangeCount > 0        
				? document.getSelection()!.getRangeAt(0)     
				: false;                                    
		el.select();                                    
		document.execCommand('copy');                   
		document.body.removeChild(el);                  
		if (selected) {                                 
			document.getSelection()!.removeAllRanges();    
			document.getSelection()!.addRange(selected);   
		}
	}

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

		if (PasswordForm._isValidURL(input.value)) {
			window.open(input.value, '_blank');
		} else {
			window.open(`//${input.value}`, '_blank');
		}
	}

	public getSelectedViewSize(password: MetaPasswords[0]|null,
		websites: MetaPasswords[0]['websites'] = (password && password.websites) || []) {
			if (this.props.editing) {
				//Height without websites: 513
				//Single website height: 156
				//Size per website: 156 + 10px margin
				return 513 + 156 + ((websites.length - 1) * (156 + 10));
			} else {
				return 580;
			}
		}

	private async _sizeChange(websites: MetaPasswords[0]['websites'] = this.props.visibleWebsites) {	
		await this.props.parent.$.sizer.setSize(this.getSelectedViewSize(
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

	public onDelete() {
		if (!this.props.parent) {
			PaperToast.create({
				content: 'Couldn\'t find containing component',
				duration: PaperToast.DURATION.SHORT
			});
		} else {
			this.props.parent.deletePassword(this.props.selectedDisplayed);
		}
	}

	private _getFormData(): PasswordDetailChanges {
		return {
			username: this.$.passwordUsername.value,
			password: this.$.passwordPassword.value,
			notes: this.$.noteInput.value.split('\n'),
			twofactor_enabled: this.$.passwordSettings2faCheckbox.checked,
			u2f_enabled: this.$.passwordSettingsu2fCheckbox.checked,
			websites: this._getWebsites(),
			twofactor_secret: this.$.twofactorToken.value
		};
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

	private static _areSame(str1: string|null, str2: string|null): boolean {
		if (!str1 || !str2) {
			return !str1 === !str2;
		}
		return str1.trim() === str2.trim();
	}

	private _getChanged(newPassword: PasswordDetailChanges): ToBools<PasswordDetailChanges> {
		let websitesChanged: boolean = false;
		if (this.props.selectedDisplayed!.websites.length !== newPassword.websites.length) {
			websitesChanged = true;
		}
		for (let i = 0; i < this.props.selectedDisplayed!.websites.length; i++) {
			if (!PasswordForm._areSame(
				this.props.selectedDisplayed!.websites[i].exact,
				newPassword.websites[i].url)) {
					websitesChanged = true;
				}
		}
		return {
			username: !PasswordForm._areSame(this.props.selectedDisplayed!.username,
				newPassword.username),
			twofactor_secret: !PasswordForm._areSame(newPassword.twofactor_secret,
				passwordDetailDataStore[passwordDetailDataSymbol]!.twofactor_secret),
			password: !PasswordForm._areSame(newPassword.password,
				passwordDetailDataStore[passwordDetailDataSymbol]!.password),
			notes: !PasswordForm._areSame(newPassword.notes.join('\n'),
				passwordDetailDataStore[passwordDetailDataSymbol]!.notes.join('\n')),
			twofactor_enabled: this.props.selectedDisplayed!.twofactor_enabled !== newPassword.twofactor_enabled,
			u2f_enabled: this.props.selectedDisplayed!.u2f_enabled !== newPassword.u2f_enabled,
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

	public setSelected(item: MetaPasswords[0]|null) {
		this.refresh();
		this.props.selectedDisplayed = item;
		if (item && item.websites) {
			this.props.visibleWebsites = item.websites;
		}
		this._force2FATokenGeneration();
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
		this.setSelected(this.props.selectedDisplayed);
	}

	@bindToClass
	public async saveChanges() {
		const newData = this._getFormData();
		const changed = this._getChanged(newData);

		if (!this._hasChanged(changed)) {
			PaperToast.create({
				content: 'No changes', 
				duration: PaperToast.DURATION.SHORT
			});
			return;
		}

		this.$.saveChanges.setState('loading');
		await wait(300);
		const [, response] = await Promise.all([
			wait(300), 
			new Promise<{
				success: boolean;
			}>((resolve) => {
				if (this.props.parent) {
					this.props.parent.saveChanges(newData, changed, (success) => {
						resolve({
							success
						});
					});
				} else {
					PaperToast.createHidable('Failed to find containing element',
						PaperToast.DURATION.SHORT);
					resolve({
						success: false
					});
				}
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

	@bindToClass
	hideFAB() {
		console.log('hidende');
		this.$.editButton.fadeOut();
	}

	@bindToClass
	showFAB() {
		console.log('showende');
		this.$.editButton.fadeIn();
	}

	mounted() {
		const parent = this.parentNode as ShowHidableView;
		if (!parent) return;
		parent.onHide = this.hideFAB;
		parent.onShow = this.showFAB;
	}
}