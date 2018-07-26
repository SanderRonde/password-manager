import * as React from 'react';

export class HorizontalCenterer extends React.Component<{}, {}> {
	constructor(props: {}) {
		super(props);
	}

	render() {
		return (
			<div className="centererContainer horizontal">
				<div className="centerer horizontal">
					{this.props.children}
				</div>
			</div>
		)
	}
}