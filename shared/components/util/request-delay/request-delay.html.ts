import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { RequestDelay } from './request-delay';
import { html } from 'lit-html';

export const RequestDelayHTML = new TemplateFn<RequestDelay>(function (props) {
	return html`
		<div id="outerContainer">
			<div id="toastContainer">
				<div id="toastContent">
					<div id="toastText">
						${props.state === 'waiting' ? html`
							<span>Waiting for request timeout, </span>
						` : html`
							<span>Waiting for server response... </span>
						`}
						<span>${Math.max(props.requests - 1, 0)}</span>
						<span> requests remaining ${`(${props.secs}s until next one)`}</span>
						<more-info open-up info="${'Most API requests are ratelimited, in order to not' +
						' run into this limit and to avoid dropping requests, they are' +
						' queued up until they can be sent. ' +
						''}"></more-info>
					</div>
				</div>
			</div>
			<div id="animationLine"></div>
		</div>
	`
}, CHANGE_TYPE.PROP);
