import { CheckmarkSize } from "../../icons/checkmark/checkmark";
import { AnimatedButton } from "./animated-button";
import { CrossSize } from "../../icons/cross/cross";
import { html } from "lit-html";

export function AnimatedButtonHTML(this: AnimatedButton) {
	const Checkmark = CheckmarkSize(35);
	const Cross = CrossSize(35);

	return html`
		${this.css}
		<button id="button" class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect">
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
}