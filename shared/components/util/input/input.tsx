import { StyleRules, withStyles, createStyles } from '@material-ui/core/styles';
import { WithStyles } from '@material-ui/core/styles/withStyles';
import * as React from 'react';

const styles = (): StyleRules<string> => createStyles({
	label: {
		fontWeight: 'bold',
		display: 'block',
		clear: 'both',
		marginBottom: '0.2em',
		color: '#5F6862',
		fontSize: '0.8rem',
		textTransform: 'uppercase'
	},

	input: {
		display: 'block',
		clear: 'both',
		borderRadius: 0,
		boxShadow: 'none',
		WebkitAppearance: 'none',
		padding: '0.6em 0.6em',
		marginBottom: '0.5em',
		width: '420px',
		boxSizing: 'border-box',
		outline: 'none',
		border: '2px solid #D3D7D4',
		background: '#F9F9F9',
		transition: '0.15s all ease-in-out'
	}
});

interface InputProps extends WithStyles<typeof styles> {
	label?: string;
	type?: 'text'|'password'|'email';
	required?: boolean;
	autofocus?: boolean;
	name: string;
  	innerRef?: React.Ref<any> | React.RefObject<any>;
}
class Input extends React.Component<InputProps, {}> {
	constructor(props: InputProps) {
		super(props);
	}

	render() {
		return (
			<div className="input">
				<label htmlFor={this.props.name} className={this.props.classes!.label}>
					{this.props.label || ''}
				</label>
				<input name={this.props.name} className="inputInput" type={this.props.type || 'text'} 
					required={this.props.required} autoFocus={this.props.autofocus}/>
			</div>
		)
	}
}

export const CustomInput = withStyles(styles)(Input);