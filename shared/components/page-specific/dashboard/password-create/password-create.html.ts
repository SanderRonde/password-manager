import { passwordDetailDataStore, passwordDetailDataSymbol } from '../password-detail/password-detail.html';
import { getString, genHostUpdateFn, saveChangesButtonCustomCSS } from '../password-form/password-form.html';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Visible, VisibleHidden } from '../../../icons/visible/visible';
import { mapArr, chain } from '../../../../lib/webcomponent-util';
import { Cross } from '../../../icons/cross/cross';
import { PasswordCreate } from './password-create';

export const PasswordCreateHTML = new TemplateFn<PasswordCreate>(function (html, props, theme) {
	return html`
		<div id="passwordCredentials">
			<material-input id="passwordUsername" name="username"
				type="text" title="Account username"
				autoComplete="off" fill label="username"
				value="${getString(props.selectedDisplayed && props.selectedDisplayed.username, '')}"
			></material-input>
			<material-input id="passwordPassword" name="password"
				class="${{
					'hidden': !passwordDetailDataStore[passwordDetailDataSymbol] ||
						!passwordDetailDataStore[passwordDetailDataSymbol]!.password
				}}"
				type="${props.passwordVisible ? 'text' : 'password'}" title="Account password"
				autoComplete="off" fill label="password"
				value="${getString(passwordDetailDataStore[passwordDetailDataSymbol] &&
					passwordDetailDataStore[passwordDetailDataSymbol]!.password, '')}"
			>
				<div slot="postIcon">
					<icon-button tabIndex="-1"
						aria-label="Copy username first and password 5s later" 
						title="Copy username first and password 5s later"
						@click="${this.onToggleShowPasswordClick}"
					>
						${props.passwordVisible ? Visible : VisibleHidden}
					</icon-button>
				</div>
			</material-input>
			<material-input id="twofactorToken"
				type="text" title="2FA Secret"
				autoComplete="off" fill label="2FA Secret"
				class="${{
					'hidden': !passwordDetailDataStore[passwordDetailDataSymbol] ||
						!passwordDetailDataStore[passwordDetailDataSymbol]!.twofactor_secret
				}}"
			></material-input>
		</div>
		<div id="passwordWebsites">
			${mapArr((props.visibleWebsites || []).map((website, index, arr) => {
				return html`
					<div class="passwordWebsite" data-index="${index}">
						<div class="passwordWebsiteEditableFields">
							<material-input class="passwordWebsiteExact"
								name="url" type="text" title="website URL"
								autoComplete="off" fill label="url"
								@@keydown="${chain(genHostUpdateFn(this, index),
									this.urlChange)}"
								value="${website.exact || ''}"
							></material-input>
							<material-input class="passwordWebsiteHost"
								name="host" type="text" 
								title="website host (determined from url above)"
								autoComplete="off" fill label="host"
								value="${website.host || ''}"
								disabled
							></material-input>
						</div>
						<div class="passwordWebsiteRemoveCenterer">
							${arr.length === 1 ? 
								html`
									<icon-button class="passwordWebsiteRemoveField"
										tabIndex="-1" aria-label="Last website can't be removed"
										title="Last website can't be removed" disabled
										@click="${this.removeLastWebsite}"
									>${Cross}</div>
								` : html`
									<icon-button class="passwordWebsiteRemoveField"
										tabIndex="-1" aria-label="Remove website"
										title="Remove website"
										@click="${this.removeWebsite}"
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
					@@click="${this.addWebsite}"
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
							@@change="${this.u2fSelectedChange}"
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
							@@change="${this.twofactorSelectedChange}"
							disabled="${!(props.parent &&
								props.parent.u2fSupported())}"
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
			<paper-button aria-label="Discard changes" color="${theme.error}"
				border border-color="${theme.error}" flat
				ripple-color="${theme.error}"
				@@click="${this.discard}"
			>
				Discard
			</paper-button>
			<animated-button aria-label="Create Password" 
				id="saveChanges"
				@@click="${this.finish}"
				custom-css="${saveChangesButtonCustomCSS}"
			>
				Create Password
			</animated-button>
		</div>
	`;
}, CHANGE_TYPE.PROP);
