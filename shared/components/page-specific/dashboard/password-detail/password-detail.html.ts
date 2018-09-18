import { LockClosedUnfilledSize, LockClosedSize } from '../../../icons/lockClosed/lockClosed';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { repeat, inlineListener } from '../../../../lib/webcomponent-util';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Cross, CrossSize } from '../../../icons/cross/cross';
import { PasswordDetail } from './password-detail';
import { KeySize } from '../../../icons/key/key';
import { html } from 'lit-html';

export const passwordDetailDataSymbol = Symbol('passwordDetailData');
export const passwordDetailDataStore: {
	[passwordDetailDataSymbol]: {
		password: string;
		notes: string[];
	}|null;
} = {
	[passwordDetailDataSymbol]: null
}

const retryButtonCustomCSS = new TemplateFn<AnimatedButton>((_, theme) => {
	return html`<style>
		#button {
			background: ${theme.error};
			color: ${theme.textOnNonbackground};
		}
	</style>`;
}, CHANGE_TYPE.THEME);

export const PasswordDetailHTML = new TemplateFn<PasswordDetail>(function (props, _, html) {
	return html`
		<div>
			<md-card level="3" 
				padding-vertical="0"
				padding-horizontal="0"
			>
				<sizing-block id="sizer">
					<div id="noneSelectedView" class="view visible displayed">
						<vertical-centerer>
							<horizontal-centerer>
								<div>
									<div class="lowerOpacityIcon">
										${LockClosedUnfilledSize(250)}
									</div>
									<div class="viewIconText">
										Select a password
									</div>
								</div>
							</horizontal-centerer>
						</vertical-centerer>
					</div>
					<div id="loadingView" class="view">
						<vertical-centerer>
							<horizontal-centerer>
								<div>
									<div class="staticIcon">
										<loading-spinner big active></loading-spinner>
									</div>
									<div class="viewIconText">
										Fetching password...
									</div>
								</div>
							</horizontal-centerer>
						</vertical-centerer>
					</div>
					<div id="failedView" class="view">
						<vertical-centerer>
							<horizontal-centerer>
								<div>
									<div class="staticIcon">
										${CrossSize(250)}
									</div>
									<animated-button flat id="retryButton"
										custom-css="${retryButtonCustomCSS}"
										aria-label="Retry getting password"
										on-click="${inlineListener(this.retryRequest, this)}"
									>Failed, click to retry</animated-button>
								</div>
							</horizontal-centerer>
						</vertical-centerer>
					</div>
					<div id="twofactorRequiredView" class="view">
						<vertical-centerer>
							<horizontal-centerer>
								<div>
									<div class="staticIcon">
										${LockClosedSize(250)}
									</div>
									<div class="viewIconText">
										Enter 2FA token
									</div>
									<br />
									<div id="twofactorInput">
										${repeat(6).map((_, i) => {
											return html`
												<input id="digit${i}" class="twofactorDigit" type="text"
													title="twofactor digit" autocomplete="off"
													maxlength="1">
											`;
										})}
									</div>
								</div>
							</horizontal-centerer>
						</vertical-centerer>
					</div>
					<div id="u2fRequiredView" class="view">
						<vertical-centerer>
							<horizontal-centerer>
								<div>
									<div class="staticIcon" id="u2fKeyIcon">
										${KeySize(250)}
									</div>
									<div class="viewIconText">
										Authenticate using U2F
									</div>
								</div>
							</horizontal-centerer>
						</vertical-centerer>
					</div>
					<div id="selectedView" class="view">
						<div id="passwordCredentials">
							<material-input id="passwordUsername" name="username"
								type="text" title="Account username"
								autoComplete="off" fill label="username"
								value="${(props.selected && props.selected.username) || '?'}"
							>
							</material-input>
							<material-input id="passwordPassword" name="password"
								type="password" title="Account password"
								autoComplete="off" fill label="password"
								value="${passwordDetailDataStore[passwordDetailDataSymbol] ?
									passwordDetailDataStore[passwordDetailDataSymbol]!.password : 
										'password'}"
							></material-input>
						</div>
						<div id="passwordWebsites">
							${(((props.selected && props.selected.websites) || [])
								.concat(props.addedWebsites || [])).map((website) => {
									return html`
										<div class="passwordWebsite">
											<div class="passwordWebsiteEditableFields">
												<material-input class="passwordWebsiteExact"
													name="url" type="text" title="website URL"
													autoComplete="off" fill label="url"
													value="${website.exact || ''}"
												></material-input>
												<material-input class="passwordWebsiteHost"
													name="host" type="text" title="website host"
													autoComplete="off" fill label="host"
													value="${website.host || ''}"
												></material-input>
											</div>
											<icon-button class="passwordWebsiteRemoveField"
												tabIndex="-1" aria-label="Remove website"
												title="Remove website"
											>${Cross}</div>
										</div>
									`;
							})}
						</div>
						<div id="passwordNotes">${passwordDetailDataStore[passwordDetailDataSymbol] ? 
							passwordDetailDataStore[passwordDetailDataSymbol]!.notes.join('\n') : 
								'no notes'
						}</div>
						<div id="passwordSettings"></div>
					</div>
				</sizing-block>
			</md-card>
		</div>
	`
}, CHANGE_TYPE.ALWAYS);