import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { inlineListener } from '../../../lib/webcomponent-util';
import { RequestDelay } from './request-delay';
import { html } from 'lit-html';

export const RequestDelayHTML = new TemplateFn<RequestDelay>(function (props) {
	return html`
		<div id="toastContainer">
			<div id="toastContent">
				<div id="toastText">
					${props.state === 'waiting' ? html`
						<span>Waiting for request timeout, </span>
					` : html`
						<span>Waiting for server response... </span>
					`}
					<span>${Math.max(props.requests - 1, 0)}</span>
					<span> requests remaining (</span>
					<span>${props.secs}</span>
					<span>s)</span>
					<more-info info="${'Most API requests are ratelimited, in order to not' +
					' run into this limit and to avoid dropping requests, they are' +
					' queued up until they can be sent. ' +
					''}"></more-info>
				</div>
				<div id="toastButtons">
					<paper-button aria-label="cancel" flat color="yellow" 
						class="toastButton" small
						ripple-color="white"
						on-tap=${inlineListener(this.cancelNextRequest, this)}
					>cancel</paper-button>
				</div>
			</div>
		</div>
	`
}, CHANGE_TYPE.PROP);
