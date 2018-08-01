import { WebComponent, genIs } from '../../../lib/webcomponent-util';
import { html, render } from 'lit-html';

export class HorizontalCenterer extends WebComponent {
	static is = genIs('horizontal-centerer', HorizontalCenterer);

	render(root: ShadowRoot) {
		render(html`
			<style>
				#container {
					display: flex;
					flex-direction: row;
					justify-content: center
				}

				#content {
					display: block;
				}
			</style>
			<div id="container">
				<div id="content">
					<slot></slot>
				</div>
			</div>`, root)
	}
}