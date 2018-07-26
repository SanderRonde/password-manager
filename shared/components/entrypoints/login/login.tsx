import { HorizontalCenterer } from '../../util/horizontalcenterer/horizontalcenterer';
import { VerticalCenterer } from '../../util/verticalcenterer/verticalcenterer';
import { Input } from '../../util/input/input';
import { Button } from '@material-ui/core';
import * as React from 'react';

export class Login extends React.Component<{}, {}> {
	form: React.RefObject<HTMLFormElement>;

	constructor(props: {}) {
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
					<div className="loginContainer">
						<div className="loginHeader">Log in</div>
						<hr/>
						<div className="loginContainer">
							<form ref={this.form}>
								<Input name="email" type="email" label="EMAIL-ADDRESS" required/>
								<Input name="password" type="password" label="PASSWORD" required/>
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