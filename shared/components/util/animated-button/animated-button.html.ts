import { CHANGE_TYPE, genTemplateFn } from '../../../lib/webcomponents';
import { CheckmarkSize } from "../../icons/checkmark/checkmark";
import { CrossSize } from "../../icons/cross/cross";
import { AnimatedButton } from "./animated-button";
import { html } from "lit-html";

export const AnimatedButtonHTML = genTemplateFn<AnimatedButton>(function (props) {
	const Checkmark = CheckmarkSize(35);
	const Cross = CrossSize(35);

	return html`
		<button id="button" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect"
			label="${props.ariaLabel}"
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