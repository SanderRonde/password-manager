import { optionalClassName } from '../../../lib/component-helpers';
import * as React from 'react';

export class VerticalCenterer extends React.Component<{
	fullscreen?: boolean;
}, {}> {
	constructor(props: {
		fullscreen?: boolean;
	}) {
		super(props);
	}

	render() {
		return (
			<div className={"centererContainer vertical" + optionalClassName('fullscreen', 
					this.props.fullscreen!)}>
				<div className="centerer vertical">
					{this.props.children}
				</div>
			</div>
		)
	}
}