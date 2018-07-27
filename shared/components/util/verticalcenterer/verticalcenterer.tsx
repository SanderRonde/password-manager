import { withStyles, createStyles } from '@material-ui/core/styles';
import { WithStyles } from '@material-ui/core/styles/withStyles';
import { classNames } from '../../../lib/classnames';
import * as React from 'react';

const styles = createStyles({
	container: {
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		height: '100%'
	},

	fullscreen: {
		height: '100vh'
	},

	main: {
		display: 'block'
	}
});

const _VerticalCenterer = (() => {
	interface VerticalCentererProps extends WithStyles<typeof styles> {
		fullscreen?: boolean;
	}
	return class VerticalCenterer extends React.Component<VerticalCentererProps> {
		constructor(props: VerticalCentererProps) {
			super(props);
		}

		render() {
			return (
				<div className={classNames(
					this.props.classes.container, {
						[this.props.classes.fullscreen]: this.props.fullscreen
					})}>
					<div className={this.props.classes.main}>
						{this.props.children}
					</div>
				</div>
			)
		}
	}
})();
export const VerticalCenterer = withStyles(styles)(_VerticalCenterer);