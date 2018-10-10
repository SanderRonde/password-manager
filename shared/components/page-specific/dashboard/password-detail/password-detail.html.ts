import { repeat, inlineListener } from '../../../../lib/webcomponent-util';
import { LockClosedUnfilledSize, LockClosedSize } from '../../../icons/lockClosed/lockClosed';
import { AnimatedButton } from '../../../util/animated-button/animated-button';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { CrossSize } from '../../../icons/cross/cross';
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


export const PasswordDetailHTML = new TemplateFn<PasswordDetail>(function (props, _theme, html) {
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
						<password-form id="passwordForm"
							parent="${this}"
							password-visible="true"
							visible-websites="${props.visibleWebsites}"
						></password-form>
					</div>
				</sizing-block>
			</md-card>
		</div>
	`
}, CHANGE_TYPE.PROP);