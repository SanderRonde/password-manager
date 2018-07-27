import { HorizontalCenterer } from '../../util/horizontalcenterer/horizontalcenterer';
import { VerticalCenterer } from '../../util/verticalcenterer/verticalcenterer';
import { withStyles, createStyles } from '@material-ui/core/styles';
import { WithStyles } from '@material-ui/core/styles/withStyles';
import { Button, TextField } from '@material-ui/core';
import * as React from 'react';

const styles = createStyles({
	container: {
		width: '420px'
	},

	header: {
		fontSize: '120%'
	}
});

const _Login = (() => {
	return class Login extends React.Component<WithStyles<typeof styles>, {}> {
		form: React.RefObject<HTMLFormElement>;
	
		constructor(props: WithStyles<typeof styles>) {
			super(props);
			this.submitForm = this.submitForm.bind(this);
			this.form = React.createRef();
		}
	
		submitForm() {
			this.form.current && this.form.current.submit();
		}
	
		render() {
			return (
				<VerticalCenterer fullscreen>
					<HorizontalCenterer>
						<div className={this.props.classes.container}>
							<div className={this.props.classes.header}>Log in</div>
							<hr/>
							<div className="loginContainer">
								<form method="POST" target="/login" ref={this.form}>
									<TextField name="email" type="email" label="EMAIL-ADDRESS" required/>
									<TextField name="password" type="password" label="PASSWORD" required/>
									<Button variant="contained" color="primary" onClick={this.submitForm}>dwadwa</Button>
								</form>
							</div>
							<hr/>
						</div>
					</HorizontalCenterer>
				</VerticalCenterer>
			)
		}
	}
})();
export const Login = withStyles(styles)(_Login);