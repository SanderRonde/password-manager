import { LockClosed } from "../../../icons/lockClosed/lockClosed";
import { LockOpen } from "../../../icons/lockOpen/lockOpen";
import { Login } from "./login";
import { html } from "lit-html";

export function LoginHTML(this: Login, props: Login['props']) {
	return html`
		${this.css}
		<div id="pageContainer">
			<horizontal-centerer>
				<vertical-centerer fullscreen>
					<form id="formContainer">
						<material-input id="emailInput" name="email"
							type="email" title="Account's email"
							error="Please enter a valid email address"
							autoComplete="username" fill required
							autoFocus label="Email"
						>
							<icon-button tabIndex="-1" slot="postIcon"
								aria-label="Remember email"
								title="Remember email"
								id="lockButton" fill="nontext"
							>
								${props.emailRemembered ?
									LockClosed : LockOpen
							}</icon-button>
						</material-input>
						<material-input id="passwordInput" name="password"
							type="password" title="Account password"
							error="Please enter a password"
							autoComplete="password" fill required
							autoFocus label="Password"></material-input>
						<material-input id="twofactorInput" name="twofactor"
							type="tel" autoComplete="off" fill
							pattern="\d{6}" error="Enter a 6-digit code"
							title="Twofactor authentication token (if enabled for the account)"
							autoFocus label="2FA Token (if enabled)"></material-input>
						<div id="buttonPositioner">
							<animated-button id="button" content="SUBMIT"></animated-button>
						</div>
					</form>
				</vertical-centerer>
			</horizontal-centerer>
		</div>`;
}