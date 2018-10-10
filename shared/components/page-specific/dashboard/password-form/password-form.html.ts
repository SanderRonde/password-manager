import { passwordDetailDataStore, passwordDetailDataSymbol } from '../password-detail/password-detail.html';
import { inlineListener, mapArr, changeOpacity } from '../../../../lib/webcomponent-util';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { MaterialInput } from '../../../util/material-input/material-input';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Visible, VisibleHidden } from '../../../icons/visible/visible';
import { Checkmark } from '../../../icons/checkmark/checkmark';
import { getHost } from '../password-detail/password-detail';
import { Delete } from '../../../icons/delete/delete';
import { Cross } from '../../../icons/cross/cross';
import { Link } from '../../../icons/link/link';
import { Copy } from '../../../icons/copy/copy';
import { PasswordForm } from './password-form';
import { html } from 'lit-html';

const hostUpdateFns: (() => void)[] = [];
function genHostUpdateFn(container: PasswordForm, index: number) {
	if (hostUpdateFns[index]) {
		return hostUpdateFns[index];
	}
	return (hostUpdateFns[index] = () => {
		const websitesContainer = container.$.passwordWebsites;
		const websites = websitesContainer.querySelectorAll('.passwordWebsite');
		if (!websites.item(index)) {
			return;
		}
		const urlInput = websites.item(index).querySelector('.passwordWebsiteExact') as MaterialInput;
		const hostInput = websites.item(index).querySelector('.passwordWebsiteHost') as MaterialInput;
		if (!hostInput || !urlInput) {
			return;
		}
		hostInput.set(getHost(urlInput.value));
	});
}

const saveChangesButtonCustomCSS = new TemplateFn<AnimatedButton>((_, theme) => {
	return html`<style>
		#button .mdl-ripple {
			background: ${theme.success};
			background-color: ${theme.success};
		}

		:host #button:active {
			background-color: ${changeOpacity(theme.success, 30)}
		}

		#button {
			box-shadow: none;
			background: transparent;
			border: 2px solid ${theme.success};
			color: ${theme.success};
		}

		#successContent {
			fill: ${theme.success};
		}

		#button.failure {
			background-color: ${theme.error};
			border: 2px solid ${theme.error};
		}
	</style>`;
}, CHANGE_TYPE.THEME);

const deleteButtonCustomCSS = new TemplateFn<PasswordForm>(() => {
	return html`<style>
		#button {
			padding: 6px 10px;
		}
	</style>`;
}, CHANGE_TYPE.NEVER);

export const PasswordFormHTML = new TemplateFn<PasswordForm>(function (props, theme, html) {
	return html`
	<div id="passwordCredentials">
		<material-input id="passwordUsername" name="username"
			type="text" title="Account username"
			autoComplete="off" fill label="username"
			value="${(props.selectedDisplayed && props.selectedDisplayed.username) || '?'}"
		>
			<div slot="postIcon">
				<icon-button tabIndex="-1" class="copy"
					aria-label="Copy username" title="Copy username"
					on-click="${inlineListener(this.copyCredential, this)}"
				>
					${Copy}
				</icon-button>
				<icon-button tabIndex="-1" class="copyDone"
					aria-label="Copy username" title="Copy username"
					on-click="${inlineListener(this.copyCredential, this)}"
				>
					${Checkmark}
				</icon-button>
			</div>
		</material-input>
		<material-input id="passwordPassword" name="password"
			type="${props.passwordVisible ? 'text' : 'password'}" title="Account password"
			autoComplete="off" fill label="password"
			value="${passwordDetailDataStore[passwordDetailDataSymbol] ?
				passwordDetailDataStore[passwordDetailDataSymbol]!.password : 
					'password'}"
		>
			<div slot="postIcon">
				<icon-button tabIndex="-1"
					aria-label="Copy username first and password 5s later" 
					title="Copy username first and password 5s later"
					on-click="${inlineListener(this.onToggleShowPasswordClick, this)}"
				>
					${props.passwordVisible ? Visible : VisibleHidden}
				</icon-button>
				<icon-button tabIndex="-1" class="copy"
					aria-label="Copy username" title="Copy username"
					on-click="${inlineListener(this.copyCredential, this)}"
				>
					${Copy}
				</icon-button>
				<icon-button tabIndex="-1" class="copyDone"
					aria-label="Copy username" title="Copy username"
					on-click="${inlineListener(this.copyCredential, this)}"
				>
					${Checkmark}
				</icon-button>
			</div>
		</material-input>
	</div>
	<div id="passwordWebsites">
		${mapArr((props.visibleWebsites || []).map((website, index, arr) => {
			return html`
				<div class="passwordWebsite" data-index="${index}">
					<div class="passwordWebsiteEditableFields">
						<material-input class="passwordWebsiteExact"
							name="url" type="text" title="website URL"
							autoComplete="off" fill label="url"
							wc-keydown="${inlineListener(genHostUpdateFn(this, index))}"
							value="${website.exact || ''}"
						>
							<icon-button tabIndex="-1" slot="postIcon"
								aria-label="Open URL" title="Open URL"
								on-click="${inlineListener(this.onLinkClick, this)}"
							>
								${Link}
							</icon-button>
						</material-input>
						<material-input class="passwordWebsiteHost"
							name="host" type="text" 
							title="website host (determined from url above)"
							autoComplete="off" fill label="host"
							value="${website.host || ''}"
							disabled
						>
							<icon-button tabIndex="-1" slot="postIcon"
								aria-label="Open URL" title="Open URL"
								on-click="${inlineListener(this.onLinkClick, this)}"
							>
								${Link}
							</icon-button>
						</material-input>
					</div>
					<div class="passwordWebsiteRemoveCenterer">
						${arr.length === 1 ? 
							html`
								<icon-button class="passwordWebsiteRemoveField"
									tabIndex="-1" aria-label="Last website can't be removed"
									title="Last website can't be removed" disabled
									on-click="${inlineListener(this.removeLastWebsite, this)}"
								>${Cross}</div>
							` : html`
								<icon-button class="passwordWebsiteRemoveField"
									tabIndex="-1" aria-label="Remove website"
									title="Remove website"
									on-click="${inlineListener(this.removeWebsite, this)}"
								>${Cross}</div>
							`}
					</div>
				</div>
			`;
		}))}
		<div id="addWebsiteCenterer">
			<paper-button aria-label="Add website"
				id="addWebsiteButton"
				border-color="${theme.accent.main}"
				color="${theme.accent.main}"
				flat ripple-color="${theme.accent.weak}"
				wc-click="${inlineListener(this.addWebsite)}"
			>Add website</paper-button>
		</div>
	</div>
	<div id="passwordNotes">
		<div id="passwordNotesInput">
			<material-input multiline id="noteInput" 
				type="text" title="Notes" rows="4"
				autoComplete="off" fill label="Notes" value="${
					passwordDetailDataStore[passwordDetailDataSymbol] ? 
						passwordDetailDataStore[passwordDetailDataSymbol]!.notes.join('\n') : 
						''}"></material-input>
		</div>
	</div>
	<div id="passwordSettings">
		<div id="passwordSettingsLayout">
			<div id="passwordSettings2fa">
				<material-checkbox checked="${props.selectedDisplayed &&
						props.selectedDisplayed.twofactor_enabled}"
						id="passwordSettings2faCheckbox">
					Enable 2FA
					<more-info info="${'2FA requires you to enter' +
						' a code generated on a secondary device' +
						' the moment you want to access this password.' +
						' This improves security by proving you have' + 
						' access to this secondary device.' + 
						' To use 2FA, it needs to be set up for your' +
						' account on the settings page.'
						}"></more-info>
				</material-checkbox>
			</div>
			<div id="passwordSettingsu2f">
				<material-checkbox checked="${props.selectedDisplayed &&
						props.selectedDisplayed.u2f_enabled}"
						disabled="${!(this.props.parent &&
							this.props.parent.u2fSupported())}"
						id="passwordSettingsu2fCheckbox">
					Enable U2F
					<more-info info="${'U2F requires you to' +
						' connect a trusted device (usually a USB key)' + 
						' to your computer. Since there is only one' +
						' key out there that works for you and it\'s' + 
						' in your possession, no-one else can read your' +
						' passwords.' +
						' To use U2F, it needs to be set up for your' +
						' account on the settings page and you need to' +
						' register an instance, not the web dashboard.'
					}"></more-info>
				</material-checkbox>
			</div>
		</div>
	</div>
	<div id="passwordButtons">
		<paper-button aria-label="Delete password" 
			color="white"
			background="${theme.error}"
			ripple-color="white"
			custom-css="${deleteButtonCustomCSS}"
			wc-click="${inlineListener(this.onDelete, this)}"
		>
			<div id="deleteButtonIcon">
				${Delete}
			</div>
		</paper-button>
		<paper-button aria-label="Discard changes" color="${theme.error}"
			border border-color="${theme.error}" flat
			ripple-color="${theme.error}"
			wc-click="${inlineListener(this.discardChanges, this)}"
		>
			Discard
		</paper-button>
		<animated-button aria-label="Save changes" 
			id="saveChanges"
			wc-click="${inlineListener(this.saveChanges, this)}"
			custom-css="${saveChangesButtonCustomCSS}">
			Save changes
		</animated-button>
	</div>`;
}, CHANGE_TYPE.ALWAYS);