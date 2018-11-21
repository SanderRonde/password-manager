import { LockClosedUnfilledSize, LockClosedSize } from '../../../icons/lockClosed/lockClosed';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { ProjectTheme } from '../../../theming/theme/theme';
import { repeat } from '../../../../lib/webcomponent-util';
import { CrossSize } from '../../../icons/cross/cross';
import { PasswordDetail } from './password-detail';
import { KeySize } from '../../../icons/key/key';

export const passwordDetailDataSymbol = Symbol('passwordDetailData');
export const passwordDetailDataStore: {
	[passwordDetailDataSymbol]: {
		password: string|null;
		notes: string[];
		twofactor_secret: string|null;
	}|null;
} = {
	[passwordDetailDataSymbol]: null
}

const retryButtonCustomCSS = new TemplateFn<AnimatedButton, ProjectTheme>((html, _props, theme) => {
	return html`<style>
		#button {
			background: ${theme.error};
			color: ${theme.textOnNonbackground};
		}
	</style>`;
}, CHANGE_TYPE.THEME);


export const PasswordDetailHTML = new TemplateFn<PasswordDetail>(function (html, props, _theme) {
	return html`
		<div>
			<md-card level="3" 
				padding-vertical="0"
				padding-horizontal="0"
			>
				<sizing-block id="sizer" max-height="84vh">
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
										@click="${this.retryRequest}"
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
						<password-form id="passwordForm"
							#parent="${this}"
							password-visible="true"
							#visible-websites="${props.visibleWebsites || []}"
						></password-form>
					</div>
					<div id="newPasswordView" class="view">
						<password-create id="passwordCreate"
							#parent="${this}"
						></password-create>
					</div>
				</sizing-block>
			</md-card>
		</div>
	`
}, CHANGE_TYPE.PROP);