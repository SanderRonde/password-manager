import * as React from 'react';

export class DataContainer<D> extends React.Component<{
	data: D;
	suppressHydrationWarning?: boolean;
}, {}> {
	constructor(props: {
		data: D;
		suppressHydrationWarning?: boolean;
	}) {
		super(props);
	}

	getData(): D {
		return this.props.data;
	}

	render() {
		return (
			<div hidden></div>
		)
	}
}