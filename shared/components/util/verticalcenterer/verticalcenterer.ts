// import { withStyles, createStyles } from '@material-ui/core/styles';
// import { WithStyles } from '@material-ui/core/styles/withStyles';
// import { classNames } from '../../../lib/react-util';
// import * as React from 'react';

// const styles = createStyles({
// 	container: {
// 		display: 'flex',
// 		flexDirection: 'column',
// 		justifyContent: 'center',
// 		height: '100%'
// 	},

// 	fullscreen: {
// 		height: '100vh'
// 	},

// 	main: {
// 		display: 'block'
// 	}
// });

// export interface VerticalCentererProps extends WithStyles<typeof styles> {
// 	fullscreen?: boolean;
// }
// const _VerticalCenterer = (() => {
// 	return class VerticalCenterer extends React.Component<VerticalCentererProps> {
// 		constructor(props: VerticalCentererProps) {
// 			super(props);
// 		}

// 		render() {
// 			return (
// 				<div className={classNames(
// 					this.props.classes.container, {
// 						[this.props.classes.fullscreen]: this.props.fullscreen
// 					})}>
// 					<div className={this.props.classes.main}>
// 						{this.props.children}
// 					</div>
// 				</div>
// 			)
// 		}
// 	}
// })();
// export const VerticalCenterer = withStyles(styles)(_VerticalCenterer);

import { WebComponent, defineProps, PROP_TYPE, genIs, classNames } from '../../../lib/webcomponent-util';
import { html } from 'lit-html';

export class VerticalCenterer extends WebComponent {
	static is = genIs('vertical-centerer', VerticalCenterer);

	constructor() {
		super();
	}

	props = defineProps(this, {
		fullscreen: PROP_TYPE.BOOL
	}, {}, this.__render);

	render() {
		return html`
			<style>
				#container {
					display: flex;
					flex-direction: column;
					justify-content: center;
					height: 100%;
				}

				.fullscreen {
					height: 100vh;
				}

				#content {
					display: block;
				}
			</style>
			<div id="container" class="${classNames({
				fullscreen: this.props.fullscreen
			})}">
				<div id="content">
					<slot></slot>
				</div>
			</div>`;
	}
}