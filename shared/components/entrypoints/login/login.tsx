import { Button, TextField, FormControl, InputLabel, InputAdornment, IconButton, Input } from '@material-ui/core';
import { HorizontalCenterer } from '../../util/horizontalcenterer/horizontalcenterer';
import { VerticalCenterer } from '../../util/verticalcenterer/verticalcenterer';
import { withStyles, createStyles } from '@material-ui/core/styles';
import { WithStyles } from '@material-ui/core/styles/withStyles';
import { ICON_STATE } from '../../../../server/app/lib/util';
import { classNames } from '../../../lib/classnames';
import { Lock, LockOpen } from '@material-ui/icons'
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
	}
});

const _Login = (() => {
	return class Login extends React.Component<WithStyles<typeof styles>, {
		emailRemembered: ICON_STATE;
	}> {
		form: React.RefObject<HTMLFormElement>;
		emailInput: React.RefObject<HTMLInputElement>;
		didInitialRender: boolean = false;
	
		constructor(props: WithStyles<typeof styles>) {
			super(props);
			this.submitForm = this.submitForm.bind(this);
			this.handleEmailRememberToggle = this.handleEmailRememberToggle.bind(this);
			this.form = React.createRef();
			this.emailInput = React.createRef();

			if (typeof localStorage === 'undefined') {
				this.state = {
					emailRemembered: ICON_STATE.HIDDEN
				};
			} else {
				this.state = {
					emailRemembered: this._getRememberedEmail() !== null ?
						ICON_STATE.ENABLED : ICON_STATE.DISABLED
				};
			}
		}

		private _getRememberedEmail() {
			if (typeof localStorage === 'undefined') {
				return null;
			}
			return localStorage.getItem('rememberedEmail');
		}
	
		submitForm() {
			if (this.state.emailRemembered === ICON_STATE.ENABLED) {
				const email = this.emailInput.current && 
					this.emailInput.current.value;
				localStorage.setItem('rememberedEmail', email || '');
			}
			
			this.form.current && this.form.current.submit();
		}

		handleEmailRememberToggle() {
			const wasEnabled = this.state.emailRemembered === ICON_STATE.ENABLED;
			this.setState({
				emailRemembered: wasEnabled ?
					ICON_STATE.ENABLED : ICON_STATE.DISABLED
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

		render() {
			const str = this._render();
			if (!this.didInitialRender && this.emailInput.current) {
				this.didInitialRender = true;
				const inputValue = this._getRememberedEmail();
				if (inputValue !== null) {
					this.emailInput.current.value = inputValue;
				}
			}
			return str;
		}
	
		_render() {
			return (
				<VerticalCenterer fullscreen>
					<HorizontalCenterer>
						<div className={this.props.classes.filling}>
							<div className="loginContainer">
								<form method="POST" target="/login" ref={this.form}>
									<FormControl className={this.props.classes.filling}>
										<InputLabel htmlFor="adornment-email">EMAIL</InputLabel>
										<Input id="adornment-email" name="email" type="email"
											innerRef={this.emailInput} endAdornment={
												<InputAdornment position="end">
													<IconButton aria-label="Remember email"
														onClick={this.handleEmailRememberToggle}
														onMouseDown={this.preventDefault}
													>
														{this.state.emailRemembered !== ICON_STATE.HIDDEN &&
															this.state.emailRemembered === ICON_STATE.ENABLED ? 
																<Lock /> : <LockOpen />}
													</IconButton>
												</InputAdornment>	
											}/>
									</FormControl>
									<div className={this.props.classes.marginTopSmall}>
										<TextField className={classNames(
											this.props.classes.filling
										)} name="password" type="password"
											label="PASSWORD"/>
									</div>
									<div className={classNames(
										this.props.classes.floatChildRight,
										this.props.classes.buttonStyles
									)}>
										<Button variant="raised" size="large" color="primary" 
												onClick={this.submitForm}>
											Submit
										</Button>
									</div>
								</form>
							</div>
						</div>
					</HorizontalCenterer>
				</VerticalCenterer>
			)
		}
	}
})();
export const Login = withStyles(styles)(_Login);