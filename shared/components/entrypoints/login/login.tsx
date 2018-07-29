import { Button, TextField, FormControl, InputLabel, InputAdornment, IconButton, Input } from '@material-ui/core';
import { HorizontalCenterer } from '../../util/horizontalcenterer/horizontalcenterer';
import { VerticalCenterer } from '../../util/verticalcenterer/verticalcenterer';
import { ServerPublicKey } from '../../../../server/app/database/db-types';
import { DataContainer } from '../../util/datacontainer/datacontainer';
import { withStyles, createStyles } from '@material-ui/core/styles';
import { WithStyles } from '@material-ui/core/styles/withStyles';
import { ICON_STATE } from '../../../../server/app/lib/util';
import { classNames } from '../../../lib/classnames';
import LockOpen from '@material-ui/icons/LockOpen';
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

function getLogin<D extends LoginData>(data: D|null = null) {
	return class Login extends React.Component<WithStyles<typeof styles>, {
		emailRemembered: ICON_STATE;
	}> {
		emailInput: React.RefObject<HTMLInputElement>;
		dataContainer: React.RefObject<DataContainer<D>>;

		constructor(props: WithStyles<typeof styles>) {
			super(props);
			this.attemptLogin = this.attemptLogin.bind(this);
			this.handleEmailRememberToggle = this.handleEmailRememberToggle.bind(this);
			this.emailInput = React.createRef();
			this.dataContainer = React.createRef();

			this.state = {
				emailRemembered: ICON_STATE.HIDDEN
			};
		}

		getData(): D|null {
			return this.dataContainer.current && this.dataContainer.current.getData();
		}

		attemptLogin() {
			if (this.state.emailRemembered === ICON_STATE.ENABLED) {
				const email = this.emailInput.current && 
					this.emailInput.current.value;
				localStorage.setItem('rememberedEmail', email || '');
			}
			
			// const data = this.getData();
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
											innerRef={this.emailInput} endAdornment={
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
											onClick={this.attemptLogin}
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