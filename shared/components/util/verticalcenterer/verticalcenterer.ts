import { WebComponent, defineProps, PROP_TYPE, genIs, classNames } from '../../../lib/webcomponent-util';
import { html } from 'lit-html';

export class VerticalCenterer extends WebComponent {
	static is = genIs('vertical-centerer', VerticalCenterer);

	constructor() {
		super();
		this.__render();
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

				#container.fullscreen {
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