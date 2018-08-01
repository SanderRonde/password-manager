// import { withStyles, createStyles } from '@material-ui/core/styles';
// import { WithStyles } from '@material-ui/core/styles/withStyles';
// import * as React from 'react';

// const styles = createStyles({
// 	container: {
// 		display: 'flex',
// 		flexDirection: 'row',
// 		justifyContent: 'center'
// 	},

// 	main: {
// 		display: 'block'
// 	}
// });

// const _HorizontalCenterer = (() => {
// 	return class HorizontalCenterer extends React.Component<WithStyles<typeof styles>, {}> {
// 		constructor(props: WithStyles<typeof styles>) {
// 			super(props);
// 		}

// 		render() {
// 			return (
// 				<div className={this.props.classes.container}>
// 					<div className={this.props.classes.main}>
// 						{this.props.children}
// 					</div>
// 				</div>
// 			)
// 		}
// 	}
// })();
// export const HorizontalCenterer = withStyles(styles)(_HorizontalCenterer);