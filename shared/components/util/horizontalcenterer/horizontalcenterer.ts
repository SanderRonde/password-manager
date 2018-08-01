import { WebComponent, genIs, css } from '../../../lib/webcomponent-util';
import { html } from 'lit-html';

const styles = css(`<style>
	#container {
		display: flex;
		flex-direction: row;
		justify-content: center
	}

	#content {
		display: block;
	}
</style>`);

export class HorizontalCenterer extends WebComponent {
	static is = genIs('horizontal-centerer', HorizontalCenterer);

	constructor() {
		super();
		this.__render();
	}

	render() {
		return html`
			${styles}
			<div id="container">
				<div id="content">
					<slot></slot>
				</div>
			</div>`
	}
}