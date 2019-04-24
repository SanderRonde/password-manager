import { TemplateFn, CHANGE_TYPE } from 'wclib';
import { PaperToast } from './paper-toast';

export const PaperToastHTML = new TemplateFn<PaperToast>((html, props) => {
	return html`
		<div id="toastContainer">
			<div id="toastContent">
				<div id="toastText">${props.content}</div>
				<div id="toastButtons">
					${[props.button1, props.button2]
						.filter(val => val).map((text) => {
							return html`
								<paper-button aria-label="${text}" flat color="yellow" 
									class="toastButton" small
									ripple-color="white"
								>${text}</paper-button>
							`
						})}
				</div>
			</div>
		</div>
	`
}, CHANGE_TYPE.PROP);