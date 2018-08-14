import { PaperToast } from './paper-toast';
import { html } from 'lit-html';

export function PaperToastHTML(this: PaperToast) {
	return html`
		${this.css}
		<div id="toastContainer">
			<div id="toastContent">
				<div id="toastText">${this.props.content}</div>
				<div id="toastButtons">
					${[this.props.button1, this.props.button2]
						.filter(val => val).map((text) => {
							return html`
								<paper-button flat color="yellow" 
									class="toastButton" small
									ripple-color="white"
								>${text}</paper-button>
							`
						})}
				</div>
			</div>
		</div>
	`
}