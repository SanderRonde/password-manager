import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { LockClosed } from "../../../icons/lockClosed/lockClosed";
import { LockOpen } from "../../../icons/lockOpen/lockOpen";
import { Login } from "./login";

export const LoginHTML = new TemplateFn<Login>(function (html, props, _) {
	return html`
		<div id="loginPageContainer">
			<div id="lockAnimationContainer">
				<div id="lockAnimationTopHalf">
					<div id="lockAnimationLockTop">
						<div id="lockAnimationRing"></div>
					</div>
				</div>
				<div id="lockAnimationBottomHalf">
					<div id="lockAnimationLockBottom">
						<div id="lockAnimationBlock">
							<div class="lockAnimationBlockCentererVertical">
								<div id="lockAnimationCircle">
									<div class="lockAnimationBlockCentererVertical">
										<div id="lockAnimationKeySlot"></div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
			<div id="pageContainer">
				<horizontal-centerer>
					<vertical-centerer fullscreen>
						<md-card padding-vertical="45" padding-horizontal="75" 
							id="formCard" level="2"
						>
							<form id="formContainer">
								<material-input id="emailInput" name="email"
									type="email" title="Account's email"
									error="Please enter a valid email address"
									autoComplete="username" fill required
									@@valid="${this.updateValidity}"
									@@keydown="${this.onKeyDown}"
									autoFocus label="Email"
								>
									<icon-button tabIndex="-1" slot="postIcon"
										aria-label="Remember email"
										title="Remember email"
										id="lockButton"
										@click="${this.handleEmailRememberToggle}"
									>
										${props.emailRemembered ?
											LockClosed : LockOpen
									}</icon-button>
								</material-input>
								<material-input id="passwordInput" name="password"
									type="password" title="Account password"
									error="Please enter a password"
									autoComplete="password" fill required
									@@valid="${this.updateValidity}"
									@@keydown="${this.onKeyDown}"
									autoFocus label="Password"></material-input>
								<material-input id="twofactorInput" name="twofactor"
									type="tel" autoComplete="off" fill
									pattern="\\d{6}" error="Enter a 6-digit code"
									title="Twofactor authentication token (if enabled for the account)"
									@@valid="${this.updateValidity}"
									@@keydown="${this.onKeyDown}"
									autoComplete="false"
									autoFocus label="2FA Token (if enabled)"></material-input>
								<div id="buttonPositioner">
									<animated-button aria-label="Submit form" id="button" 
										@click="${this.onLogin}"
										content="SUBMIT"
									></animated-button>
								</div>
							</form>
						</md-card>
					</vertical-centerer>
				</horizontal-centerer>
				<theme-selector id="themeSelector"></theme-selector>
				<paper-dialog>
					<div slot="content">
						<h1>Settings</h1>
						<div id="dialogContent">
							<div id="resetUserPassword">
								<h2>Reset user password</h2>
								<p>Warning: all protections (U2F and 2FA) are removed after reset</p>
								<material-input id="resetEmail"
									type="email" title="Account's email"
									error="Please enter a valid email address"
									autoComplete="username" fill
									label="Email"
								></material-input>
								<material-input id="resetKey"
									type="text" title="Reset key"
									fill label="Reset key"
									autoComplete="false"
								></material-input>
								<material-input id="resetPassword"
									type="password" title="New password"
									fill label="New password"
									autoComplete="false"
								></material-input>
								<animated-button aria-label="Reset account password"
								>
									Reset
								</animated-button>
							</div>
							<div id="undoReset">
								<!-- TODO: undo reset -->
								<h2>Reset user password</h2>
								<p>Warning: all protections (U2F and 2FA) are removed after reset</p>
								<material-input id="resetEmail"
									type="email" title="Account's email"
									error="Please enter a valid email address"
									autoComplete="username" fill
									label="Email"
								></material-input>
								<material-input id="resetKey"
									type="text" title="Reset key"
									fill label="Reset key"
									autoComplete="false"
								></material-input>
								<material-input id="resetPassword"
									type="password" title="New password"
									fill label="New password"
									autoComplete="false"
								></material-input>
								<animated-button aria-label="Reset account password"
								>
									Undo reset
								</animated-button>
							</div>
							<!-- TODO: "enable notifications" button -->
						</div>
					</div>
					<div slot="buttons">
						<paper-button flat>CLOSE</paper-button>
					</div>
				</paper-dialog>
			</div>
		</div>`;
}, CHANGE_TYPE.PROP);