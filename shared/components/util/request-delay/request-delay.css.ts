import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { PaperToastCSS } from '../paper-toast/paper-toast.css';
import { RequestDelay } from './request-delay';
import { html } from 'lit-html';

export const RequestDelayCSS = new TemplateFn<RequestDelay>(function () {
	return html`<style>
		${PaperToastCSS.render(CHANGE_TYPE.THEME, this as any)}
	</style>`
}, CHANGE_TYPE.THEME);
