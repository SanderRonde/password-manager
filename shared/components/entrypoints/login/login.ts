/// <reference path="../../../types/elements.d.ts" />

// import { FormHelperText, FormControl, InputLabel, InputAdornment, IconButton, Input } from '@material-ui/core';
// import { genRSAKeyPair, encryptWithPublicKey, pad } from '../../../lib/shared-crypto';
// import { HorizontalCenterer } from '../../util/horizontalcenterer/horizontalcenterer';
// import { VerticalCenterer } from '../../util/verticalcenterer/verticalcenterer';
// import { ColoredButton } from '../../util/colored-button/colored-button';
// import { DataContainer } from '../../util/datacontainer/datacontainer';
// import { classNames, multiFunctions } from '../../../lib/react-util';
// import { withStyles, createStyles } from '@material-ui/core/styles';
// import { WithStyles } from '@material-ui/core/styles/withStyles';
// import { doClientAPIRequest } from '../../../lib/apirequests';
// import { APIReturns, API_ERRS } from '../../../types/api';
// import { ServerPublicKey } from '../../../types/db-types';
// import { bindToClass } from '../../../lib/decorators';
// import { ICON_STATE } from '../../../lib/react-util';
// import LockOpen from '@material-ui/icons/LockOpen';
// import { hash } from '../../../lib/browser-crypto';
// import Lock from '@material-ui/icons/Lock';
// import * as React from 'react';

// const styles = createStyles({
// 	filling: {
// 		width: '420px'
// 	},

// 	buttonStyles: {
// 		fontSize: '150%'
// 	},

// 	floatChildRight: {
// 		display: 'flex',
// 		flexDirection: 'row',
// 		justifyContent: 'flex-end'
// 	},

// 	circle: {
// 		borderRadius: '50%!important'
// 	}
// });

// export interface LoginData {
// 	server_public_key: ServerPublicKey;
// 	comm_token: string;
// }

// type ServerLoginResponse = APIReturns['/api/dashboard/login'];

// export interface InputValidation {
// 	dirty: boolean;
// 	valid: boolean;
// 	errorString: string;
// }

// function getLogin<D extends LoginData>(data: D|null = null) {
// 	// @bindable
// 	class Login extends React.Component<WithStyles<typeof styles>, {
// 		emailRemembered: ICON_STATE;
// 		emailValidation: InputValidation;
// 		passwordValidation: InputValidation;
// 		twofactorValidation: InputValidation;
// 		buttonState: 'normal'|'loading'|'invalid'|'valid';

// 		emailValue: string;
// 		passwordValue: string;
// 		twofactorValue: string;
// 	}> {
// 		emailInput: React.RefObject<HTMLInputElement> = React.createRef();
// 		passwordInput: React.RefObject<HTMLInputElement> = React.createRef();
// 		twofactorInput: React.RefObject<HTMLInputElement> = React.createRef();
// 		dataContainer: React.RefObject<DataContainer<D>> = React.createRef();

// 		__toBind!: ((__this: any) => void)[];
// 		__doBinds(__this: this) {
// 			if (!this.__toBind) {
// 				return;
// 			}
// 			this.__toBind.forEach((fn) => {
// 				fn(__this);
// 			});
// 		}

// 		constructor(props: WithStyles<typeof styles>) {
// 			super(props);

// 			this.__doBinds(this);
// 			this.state = {
// 				emailRemembered: ICON_STATE.HIDDEN,
// 				emailValidation: { 
// 					valid: true, 
// 					errorString: '',
// 					dirty: false
// 				},
// 				passwordValidation: { 
// 					valid: true, 
// 					errorString: '',
// 					dirty: false
// 				},
// 				twofactorValidation: { 
// 					valid: true, 
// 					errorString: '',
// 					dirty: false
// 				},
// 				buttonState: 'normal',
// 				emailValue: '',
// 				passwordValue: '',
// 				twofactorValue: ''
// 			};
// 		}

// 		getData(): D|null {
// 			return this.dataContainer.current && this.dataContainer.current.getData();
// 		}

// 		private async _doLoginRequest({
// 			email, password, twofactor_token
// 		}: {
// 			valid: boolean;
// 			email: string;
// 			password: string;
// 			twofactor_token: string|null;
// 		}): Promise<ServerLoginResponse> {
// 			const serverData = this.getData();
// 			if (serverData === null) {
// 				return {
// 					success: false,
// 					ERR: API_ERRS.NO_REQUEST_BODY,
// 					error: 'no data provided by server on page load'
// 				}
// 			}

// 			const keyPair = genRSAKeyPair();
// 			localStorage.setItem('instance_private_key', keyPair.privateKey);
// 			localStorage.setItem('instance_public_key', keyPair.publicKey);

// 			const { comm_token, server_public_key } = serverData;
// 			return await doClientAPIRequest({},
// 				'/api/dashboard/login', {
// 					comm_token,
// 					public_key: keyPair.publicKey,
// 					encrypted: encryptWithPublicKey({
// 						email: email,
// 						twofactor_token: twofactor_token || undefined,
// 						password: hash(pad(password, 'masterpwverify')),
// 					}, server_public_key)
// 				});
// 		}

// 		private async _proceedToDashboard(_serverResponse: ServerLoginResponse) {

// 		}

// 		private _failLogin(_serverResponse: ServerLoginResponse) {

// 		}

// 		private readonly EMAIL_REGEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
// 		private readonly NUMBERS_REGEX = /(\d+)/;

// 		private _getInputValue(input: React.RefObject<HTMLInputElement>) {
// 			if (input.current) {
// 				const ref = (input.current as any).inputRef as HTMLInputElement;
// 				if (ref) {
// 					return ref.value;
// 				}
// 			}
// 			return null;
// 		}

// 		@bindToClass
// 		checkInputData() {
// 			const email = this._getInputValue(this.emailInput);
// 			const password = this._getInputValue(this.passwordInput);
// 			const twofactor = this._getInputValue(this.twofactorInput);

// 			let err: boolean = false;
// 			if (this.state.emailValidation.dirty && !email) {
// 				this.setState({
// 					emailValidation: {
// 						valid: false,
// 						dirty: true,
// 						errorString: 'Please enter an email address'
// 					}
// 				});
// 				err = true;
// 			} else if (this.state.emailValidation.dirty && email && !this.EMAIL_REGEX.exec(email)) {
// 				this.setState({
// 					emailValidation: {
// 						valid: false,
// 						dirty: true,
// 						errorString: 'Invalid email address'
// 					}
// 				});
// 				err = true;
// 			} else {
// 				this.setState({
// 					emailValidation: {
// 						valid: true,
// 						dirty: this.state.emailValidation.dirty,
// 						errorString: ''
// 					}
// 				});
// 			}
// 			if (this.state.passwordValidation.dirty && !password) {
// 				this.setState({
// 					passwordValidation: {
// 						valid: false,
// 						dirty: true,
// 						errorString: 'Please enter a password'
// 					}
// 				});
// 				err = true;
// 			} else {
// 				this.setState({
// 					passwordValidation: {
// 						valid: true,
// 						dirty: this.state.passwordValidation.dirty,
// 						errorString: ''
// 					}
// 				});
// 			}
// 			if (twofactor && this.state.twofactorValidation.dirty && !this.NUMBERS_REGEX.exec(twofactor)) {
// 				this.setState({
// 					twofactorValidation: {
// 						valid: false,
// 						dirty: true,
// 						errorString: `Token contains letters`
// 					}
// 				});
// 				err = true;
// 			} else if (twofactor && this.state.twofactorValidation.dirty && twofactor.length !== 6) {
// 				this.setState({
// 					twofactorValidation: {
// 						valid: false,
// 						dirty: true,
// 						errorString: `Token is too ${twofactor.length > 6 ? 
// 							'long' : 'short'}`
// 					}
// 				});
// 				err = true;
// 			} else {
// 				this.setState({
// 					twofactorValidation: {
// 						valid: true,
// 						dirty: this.state.twofactorValidation.dirty,
// 						errorString: ''
// 					}
// 				});
// 			}
// 			return !err;
// 		}

// 		@bindToClass
// 		onEmailBlur() {
// 			this.setState({
// 				emailValidation: {
// 					valid: this.state.emailValidation.valid,
// 					dirty: true,
// 					errorString: this.state.emailValidation.errorString
// 				}
// 			});
// 		}

// 		@bindToClass
// 		onPasswordBlur() {
// 			this.setState({
// 				passwordValidation: {
// 					valid: this.state.passwordValidation.valid,
// 					dirty: true,
// 					errorString: this.state.passwordValidation.errorString
// 				}
// 			});
// 		}

// 		@bindToClass
// 		onTwofactorBlur() {
// 			this.setState({
// 				twofactorValidation: {
// 					valid: this.state.twofactorValidation.valid,
// 					dirty: true,
// 					errorString: this.state.twofactorValidation.errorString
// 				}
// 			});
// 		}

// 		private _getInputData() {
// 			const email = this.emailInput.current && 
// 				this.emailInput.current.value;
// 			const password = this.passwordInput.current &&
// 				this.passwordInput.current.value;
// 			const twofactor = this.twofactorInput.current &&
// 				this.twofactorInput.current.value;
			
// 			if (!this.checkInputData()) {
// 				return {
// 					valid: false,
// 					email: '', password: '', twofactor_token: ''
// 				}
// 			} else {	
// 				return {
// 					valid: true,
// 					email: email!, 
// 					password: password!,
// 					twofactor_token: twofactor
// 				}
// 			}
// 		}

// 		private _inputChangeTimeout: number|NodeJS.Timer|null = null;

// 		private _resetButton(timeout: number) {
// 			if (this._inputChangeTimeout) {
// 				clearTimeout(this._inputChangeTimeout as number);
// 			}
// 			this._inputChangeTimeout = setTimeout(() => {
// 				this.setState({
// 					buttonState: 'normal'
// 				});
// 			}, timeout);
// 		}

// 		@bindToClass
// 		async login() {
// 			const inputData = this._getInputData();
// 			if (inputData.valid === false) {
// 				this.setState({
// 					buttonState: 'invalid'
// 				});
// 				this._resetButton(5000);
// 			}

// 			if (this.state.emailRemembered === ICON_STATE.ENABLED) {
// 				const email = this.emailInput.current && 
// 					this.emailInput.current.value;
// 				localStorage.setItem('rememberedEmail', email || '');
// 			}
			
// 			if (typeof localStorage === 'undefined') return;

// 			this.setState({
// 				buttonState: 'loading'
// 			});
// 			const result = await this._doLoginRequest(inputData);	

// 			if (result.success) {
// 				this.setState({
// 					buttonState: 'valid'
// 				});
// 				await this._proceedToDashboard(result);
// 			} else {
// 				this._failLogin(result);
// 				this.setState({
// 					buttonState: 'invalid'
// 				});
// 				this._resetButton(5000);
// 			}
// 		}

// 		@bindToClass
// 		handleEmailRememberToggle() {
// 			const wasEnabled = this.state.emailRemembered === ICON_STATE.ENABLED;
// 			this.setState({
// 				emailRemembered: wasEnabled ?
// 					ICON_STATE.DISABLED : ICON_STATE.ENABLED
// 			});
// 			if (wasEnabled) {
// 				//Now disabled
// 				localStorage.removeItem('rememberedEmail');
// 			} else {
// 				localStorage.setItem('rememberedEmail', '');
// 			}
// 		}

// 		preventDefault(event: any) {
// 			event.preventDefault();
// 		}

// 		private _getRememberedEmail() {
// 			if (typeof localStorage === 'undefined') {
// 				return null;
// 			}
// 			return localStorage.getItem('rememberedEmail');
// 		}

// 		componentDidMount() {
// 			if (this.emailInput.current && typeof localStorage !== 'undefined') {
// 				const inputValue = this._getRememberedEmail();
// 				if (inputValue !== null) {
// 					this.emailInput.current.value = inputValue;
// 					this.setState({
// 						emailRemembered: ICON_STATE.ENABLED
// 					});
// 				} else {
// 					this.setState({
// 						emailRemembered: ICON_STATE.DISABLED
// 					});
// 				}
// 			}
// 		}

// 		// private _getButtonData() {
// 		// 	switch (this.state.buttonState) {
// 		// 		case 'normal':
// 		// 			return {
// 		// 				color: 'primary',
// 		// 				iconName: null
// 		// 			};
// 		// 		case 'loading':
// 		// 			return {
// 		// 				color: 'primary',
// 		// 				iconName: 'spinner'
// 		// 			};
// 		// 		case 'invalid':
// 		// 			return {
// 		// 				color: 'red',
// 		// 				iconName: 'cross'
// 		// 			}
// 		// 		case 'valid': 
// 		// 			return {
// 		// 				color: 'green',
// 		// 				iconName: 'checkmark'
// 		// 			}
// 		// 	}
// 		// }
		
// 		render() {
// 			return (
// 				<VerticalCenterer fullscreen>
// 					<HorizontalCenterer>
// 						<div className={this.props.classes.filling}>
// 							<div className="loginContainer">
// 								<form method="POST">
// 									<FormControl className={this.props.classes.filling} 
// 										aria-describedby="email-descr"
// 									>
// 										<InputLabel htmlFor="email-input">EMAIL</InputLabel>
// 										<Input id="email-input" name="email" type="email"
// 											title="Account's email" onBlur={this.onEmailBlur}
// 											onChange={multiFunctions(this.checkInputData)}
// 											autoComplete="username" autoFocus margin="dense"
// 											error={!this.state.emailValidation.valid}
// 											innerRef={this.emailInput} endAdornment={
// 												<InputAdornment position="end">
// 													<IconButton aria-label="Remember email"
// 														title="Remember email"
// 														onClick={this.handleEmailRememberToggle}
// 														onMouseDown={this.preventDefault}
// 														className={this.props.classes.circle}
// 													>
// 														{this.state.emailRemembered !== ICON_STATE.HIDDEN &&
// 															(this.state.emailRemembered === ICON_STATE.ENABLED ? 
// 																<Lock /> : <LockOpen />)}
// 													</IconButton>
// 												</InputAdornment>	
// 											}/>
// 											<FormHelperText error id="email-descr">{
// 												this.state.emailValidation.errorString
// 											}</FormHelperText>
// 									</FormControl>
// 									<FormControl className={this.props.classes.filling}>
// 										<InputLabel htmlFor="password-input">PASSWORD</InputLabel>
// 										<Input innerRef={this.passwordInput} className={classNames(
// 											this.props.classes.filling
// 										)} name="password" type="password" 
// 											error={!this.state.passwordValidation.valid}
// 											autoComplete="password" margin="dense"
// 											title="Account password" id="password-input" 
// 											onBlur={this.onPasswordBlur} 
// 											onChange={multiFunctions(this.checkInputData)} />
// 										<FormHelperText error color="#f44336" id="password-descr">{
// 											this.state.passwordValidation.errorString
// 										}</FormHelperText>
// 									</FormControl>
// 									<FormControl className={this.props.classes.filling}>
// 										<InputLabel htmlFor="twofactor-input">2FA TOKEN (IF ENABLED)</InputLabel>
// 										<Input innerRef={this.twofactorInput} className={classNames(
// 											this.props.classes.filling
// 										)} name="twofactor_token" type="tel"
// 											error={!this.state.twofactorValidation.valid}
// 											title="Twofactor authentication token (if enabled for the account)"
// 											autoComplete="off" id="twofactor-input" 
// 											onBlur={this.onTwofactorBlur} margin="dense"
// 											onChange={multiFunctions(this.checkInputData)} />
// 										<FormHelperText error color="#f44336" id="twofactor-descr">{
// 											this.state.twofactorValidation.errorString
// 										}</FormHelperText>
// 									</FormControl>
// 									<div className={classNames(
// 										this.props.classes.floatChildRight,
// 										this.props.classes.buttonStyles
// 									)}>
// 										<ColoredButton variant="contained" size="large" 
// 											onClick={this.login}
// 										>
// 											Submit
// 										</ColoredButton>
// 									</div>
// 								</form>
// 							</div>
// 						</div>
// 						<DataContainer ref={this.dataContainer} 
// 							data={data} suppressHydrationWarning={true} />
// 					</HorizontalCenterer>
// 				</VerticalCenterer>
// 			)
// 		}
// 	}
// 	return Login;
// }
// export function GetLoginStyled(data?: LoginData) {
// 	return withStyles(styles)(getLogin(data));
// }

import { genIs, defineProps, PROP_TYPE, isDefined, WebComponent, ComponentIs, WebComponentInterface } from '../../../lib/webcomponent-util'
import { HorizontalCenterer } from '../../util/horizontal-centerer/horizontal-centerer';
import { VerticalCenterer } from '../../util/vertical-centerer/vertical-centerer';
import { AnimatedButton } from '../../util/animated-button/animated-button';
import { MaterialInput } from '../../util/material-input/material-input';
import { IconButton } from '../../util/icon-button/icon-button';
import { bindToClass } from '../../../lib/decorators';
import { LoginIDMap } from './login-querymap';
import { LoginHTML } from './login.html';

export class Login extends WebComponent<LoginIDMap> implements WebComponentInterface {
	static dependencies = [
		VerticalCenterer, 
		HorizontalCenterer, 
		MaterialInput,
		IconButton,
		AnimatedButton
	];
	static is: ComponentIs = genIs('login-page', Login);
	static get cssProvider() {
		return import('./login.css').then((mod) => {
			return mod.LoginCSS;
		});
	}
	renderer = LoginHTML;
	props = defineProps(this, {}, {
		emailRemembered: PROP_TYPE.BOOL
	});
	loaded = true;

	constructor() {
		super();

		const inputValue = localStorage.getItem('rememberedEmail')
		if (isDefined(inputValue)) {
			this.props.emailRemembered = true;
			this.$.passwordInput.input.focus();
		} else {
			this.props.emailRemembered = false;
			this.$.emailInput.input.focus();
		}
	}

	firstRender() {
		const inputValue = localStorage.getItem('rememberedEmail')
		if (isDefined(inputValue)) {
			this.$.emailInput.set(inputValue);
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

	postRender() {
		this.$.lockButton.addEventListener('click', this.handleEmailRememberToggle);
	}
}

export { LoginHTML, LoginIDMap };
export { LoginCSS } from './login.css'