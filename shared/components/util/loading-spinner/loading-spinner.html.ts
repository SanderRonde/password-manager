import { LoadingSpinner } from "./loading-spinner";
import { TemplateFn, CHANGE_TYPE } from 'wclib';

export const LoadingSpinnerHTML = new TemplateFn<LoadingSpinner>((html) => {
	return html`
		<div id="container" class="mdl-spinner mdl-js-spinner is-active"></div>
	`;
}, CHANGE_TYPE.NEVER);