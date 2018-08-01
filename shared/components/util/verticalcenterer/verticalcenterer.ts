import { WebComponent, defineProps, PROP_TYPE, genIs, classNames, css } from '../../../lib/webcomponent-util';
import { html } from 'lit-html';

const styles = css(`<style>
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
</style>`);

export class VerticalCenterer extends WebComponent {
	static is = genIs('vertical-centerer', VerticalCenterer);

	props = defineProps(this, {
		fullscreen: PROP_TYPE.BOOL
	}, {}, this.__render);

	constructor() {
		super();
		this.__render();
	}

	render() {
		return html`
			${styles}
			<div id="container" class="${classNames({
				fullscreen: this.props.fullscreen
			})}">
				<div id="content">
					<slot></slot>
				</div>
			</div>`;
	}
}