import { WebComponent, define } from '../../../lib/webcomponent-util';
import { html, render } from 'lit-html';

export class HorizontalCenterer extends HTMLElement implements WebComponent {
	constructor() {
		super();

		this.render(this.attachShadow({
			mode: 'closed'
		}));
	}

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

	static define() {
		define('horizontal-centerer', HorizontalCenterer);
	}
}