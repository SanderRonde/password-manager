import * as React from 'react';

export class Input extends React.Component<{
	label?: string;
	type?: 'text'|'password'|'email';
	required?: boolean;
	autofocus?: boolean;
	name: string;
}, {}> {
	constructor(props: {
		label?: string;
		type?: 'text'|'password'|'email';
		required?: boolean;
		autofocus?: boolean;
		name: string;
	}) {
		super(props);
	}

	render() {
		return (
			<div className="input">
				<label htmlFor={this.props.name} className="inputLabel">
					{this.props.label || ''}
				</label>
				<input name={this.props.name} className="inputInput" type={this.props.type || 'text'} 
					required={this.props.required} autoFocus={this.props.autofocus}/>
			</div>
		)
	}
}