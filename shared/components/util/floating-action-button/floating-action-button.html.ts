import { FloatingActionButton } from './floating-action-button';
import { TemplateFn, CHANGE_TYPE } from 'wclib';

export const FloatingActionButtonHTML = new TemplateFn<FloatingActionButton>(function (html, props) {
	return html`
		<div id="floater">
			<button id="container" @click="${this.onClick}" class="${{
				hidden: props.hide
			}}">
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
