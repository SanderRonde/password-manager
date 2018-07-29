import { Button, TextField, FormControl, InputLabel, InputAdornment, IconButton, Input } from '@material-ui/core';
import { genRSAKeyPair, encryptWithPublicKey, pad } from '../../../lib/shared-crypto';
import { HorizontalCenterer } from '../../util/horizontalcenterer/horizontalcenterer';
import { VerticalCenterer } from '../../util/verticalcenterer/verticalcenterer';
import { ServerPublicKey } from '../../../../server/app/database/db-types';
import { DataContainer } from '../../util/datacontainer/datacontainer';
import { withStyles, createStyles } from '@material-ui/core/styles';
import { APIReturns, API_ERRS } from '../../../../server/app/api';
import { WithStyles } from '@material-ui/core/styles/withStyles';
import { doClientAPIRequest } from '../../../lib/apirequests';
import { ICON_STATE } from '../../../../server/app/lib/util';
import { classNames } from '../../../lib/classnames';
import LockOpen from '@material-ui/icons/LockOpen';
import { hash } from '../../../lib/browser-crypto';
import Lock from '@material-ui/icons/Lock';
import * as React from 'react';

const styles = createStyles({
	filling: {
		width: '420px'
	},

	marginTopSmall: {
		marginTop: '15px'
	},

	buttonStyles: {
		marginTop: '25px',
		fontSize: '150%'
	},

	floatChildRight: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},

	circle: {
		borderRadius: '50%!important'
	}
});

export interface LoginData {
	server_public_key: ServerPublicKey;
	comm_token: string;
}

type ServerLoginResponse = APIReturns['/api/dashboard/login'];

function getLogin<D extends LoginData>(data: D|null = null) {
	return class Login extends React.Component<WithStyles<typeof styles>, {
		emailRemembered: ICON_STATE;
	}> {
		emailInput: React.RefObject<HTMLInputElement>;
		passwordInput: React.RefObject<HTMLInputElement>;
		dataContainer: React.RefObject<DataContainer<D>>;

		constructor(props: WithStyles<typeof styles>) {
			super(props);
			this.login = this.login.bind(this);
			this.handleEmailRememberToggle = this.handleEmailRememberToggle.bind(this);
			this.emailInput = React.createRef();
			this.passwordInput = React.createRef();
			this.dataContainer = React.createRef();

			this.state = {
				emailRemembered: ICON_STATE.HIDDEN
			};
		}

		getData(): D|null {
			return this.dataContainer.current && this.dataContainer.current.getData();
		}

		private async _doLoginRequest({
			email, password, twofactor_token
		}: {
			valid: boolean;
			email: string;
			password: string;
			twofactor_token: string;
		}): Promise<ServerLoginResponse> {
			const serverData = this.getData();
			if (serverData === null) {
				return {
					success: false,
					ERR: API_ERRS.NO_REQUEST_BODY,
					error: 'no data provided by server on page load'
				}
			}

			const keyPair = genRSAKeyPair();
			localStorage.setItem('instance_private_key', keyPair.privateKey);
			localStorage.setItem('instance_public_key', keyPair.publicKey);

			const { comm_token, server_public_key } = serverData;
			return await doClientAPIRequest({},
				'/api/dashboard/login', {
					comm_token,
					public_key: keyPair.publicKey,
					encrypted: encryptWithPublicKey({
						email: email,
						twofactor_token: twofactor_token,
						password: hash(pad(password, 'masterpwverify')),
					}, server_public_key)
				});
		}

		private async _proceedToDashboard(_serverResponse: ServerLoginResponse) {

		}

		private _failLogin(_serverResponse: ServerLoginResponse) {

		}

		private _showSpinner() {}

		private _hideSpinner() {

		}

		private _getInputData() {
			const email = this.emailInput.current && 
				this.emailInput.current.value;
			const password = this.passwordInput.current &&
				this.passwordInput.current.value;
		}

		async login() {
			const inputData = this._getInputData();

			if (this.state.emailRemembered === ICON_STATE.ENABLED) {
				const email = this.emailInput.current && 
					this.emailInput.current.value;
				localStorage.setItem('rememberedEmail', email || '');
			}
			
			if (typeof localStorage === 'undefined') return;

			this._showSpinner();
			const result = await this._doLoginRequest(inputData);
			this._hideSpinner()

			if (result.success) {
				await this._proceedToDashboard(result);
			} else {
				this._failLogin(result);
			}
		}

		handleEmailRememberToggle() {
			const wasEnabled = this.state.emailRemembered === ICON_STATE.ENABLED;
			this.setState({
				emailRemembered: wasEnabled ?
					ICON_STATE.DISABLED : ICON_STATE.ENABLED
			});
			if (wasEnabled) {
				//Now disabled
				localStorage.removeItem('rememberedEmail');
			} else {
				localStorage.setItem('rememberedEmail', '');
			}
		}

		preventDefault(event: any) {
			event.preventDefault();
		}

		private _getRememberedEmail() {
			if (typeof localStorage === 'undefined') {
				return null;
			}
			return localStorage.getItem('rememberedEmail');
		}

		componentDidMount() {
			if (this.emailInput.current && typeof localStorage !== 'undefined') {
				const inputValue = this._getRememberedEmail();
				if (inputValue !== null) {
					this.emailInput.current.value = inputValue;
					this.setState({
						emailRemembered: ICON_STATE.ENABLED
					});
				} else {
					this.setState({
						emailRemembered: ICON_STATE.DISABLED
					});
				}
			}
		}
		
		render() {
			return (
				<VerticalCenterer fullscreen>
					<HorizontalCenterer>
						<div className={this.props.classes.filling}>
							<div className="loginContainer">
								<form method="POST">
									<FormControl className={this.props.classes.filling}>
										<InputLabel htmlFor="adornment-email">EMAIL</InputLabel>
										<Input id="adornment-email" name="email" type="email"
											required innerRef={this.emailInput} endAdornment={
												<InputAdornment position="end">
													<IconButton aria-label="Remember email"
														title="Remember email"
														onClick={this.handleEmailRememberToggle}
														onMouseDown={this.preventDefault}
														className={this.props.classes.circle}
													>
														{this.state.emailRemembered !== ICON_STATE.HIDDEN &&
															(this.state.emailRemembered === ICON_STATE.ENABLED ? 
																<Lock /> : <LockOpen />)}
													</IconButton>
												</InputAdornment>	
											}/>
									</FormControl>
									<div className={this.props.classes.marginTopSmall}>
										<TextField innerRef={this.passwordInput} className={classNames(
											this.props.classes.filling
										)} name="password" type="password" required
											label="PASSWORD"/>
									</div>
									<div className={this.props.classes.marginTopSmall}>
										<TextField innerRef={this.passwordInput} className={classNames(
											this.props.classes.filling
										)} name="twofactor_token" type="tel"
											autoComplete="off"
											label="2FA TOKEN (IF ENABLED)"/>
									</div>
									<div className={classNames(
										this.props.classes.floatChildRight,
										this.props.classes.buttonStyles
									)}>
										<Button variant="raised" size="large" color="primary" 
											onClick={this.login}
										>
											Submit
										</Button>
									</div>
								</form>
							</div>
						</div>
						<DataContainer ref={this.dataContainer} 
							data={data} suppressHydrationWarning={true} />
					</HorizontalCenterer>
				</VerticalCenterer>
			)
		}
	}
}
export function GetLoginStyled(data?: LoginData) {
	return withStyles(styles)(getLogin(data));
}