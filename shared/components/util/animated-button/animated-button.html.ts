import { CHANGE_TYPE, TemplateFn } from '../../../lib/webcomponents';
import { CheckmarkSize } from "../../icons/checkmark/checkmark";
import { CrossSize } from "../../icons/cross/cross";
import { AnimatedButton } from "./animated-button";
import { inlineListener } from '../../../lib/webcomponent-util';

export const AnimatedButtonHTML = new TemplateFn<AnimatedButton>(function (html, props) {
	const Checkmark = CheckmarkSize(35);
	const Cross = CrossSize(35);

	return html`
		<button id="button" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect"
			label="${props.ariaLabel}"
			aria-label="${props.ariaLabel}"
			title="${props.ariaLabel}"
			on-mouseup="${inlineListener(this.blurHandler, this, true)}"
			on-mouseleave="${inlineListener(this.blurHandler, this, true)}"
			on-click="${inlineListener(this.onButtonClick, this, true)}"
		>
			<div id="content">
				<span id="regularContent" class="visible">
					<slot></slot>
					${this.props.content}
				</span>
				<span id="successContent">
					${Checkmark}
				</span>
				<span id="failureContent">
					${Cross}
				</span>
				<span id="loadingContent">
					<loading-spinner></loading-spinner>
				</span>
			</div>
		</button>`;
}, CHANGE_TYPE.PROP);