import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { FloatingActionButton } from './floating-action-button';

export const FloatingActionButtonHTML = new TemplateFn<FloatingActionButton>(function (html) {
	return html`
		<div id="floater">
			<button id="container" @click="${this.onClick}">
				<div id="rippleContainer">
					<vertical-centerer>
						<horizontal-centerer>
							<div id="content">
								<slot></slot>
							</div>
						</horizontal-centerer>
					</vertical-centerer>
				</div>
			</button>
		</div>
	`
}, CHANGE_TYPE.PROP);
