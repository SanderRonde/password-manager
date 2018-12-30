import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { FloatingActionButton } from './floating-action-button';
import { ProjectTheme } from '../../theming/theme/theme.es';
import { RippleCSS } from '../../../mixins/ripple';
import { getShadow } from '../md-card/md-card.css';
import { html } from 'lit-html';

const floatCSS = html`<style>
	#floater {
		position: fixed;
		right: 23px;
		bottom: 23px;
	}
</style>`;

export const FloatingActionButtonCSS = new TemplateFn<FloatingActionButton, ProjectTheme>(function (html, props, theme) {
	return html`<style>
		${RippleCSS.renderTemplate(CHANGE_TYPE.ALWAYS, this)}
		${!props.noFloat ? floatCSS : ''}

		@keyframes fadeIn {
			0% {
				transform: scale(0);
			}
			100% {
				transform: scale(1);
			}
		}

		@-webkit-keyframes fadeIn {
			0% {
				-webkit-transform: scale(0);
			}
			100% {
				-webkit-transform: scale(1);
			}
		}

		@-moz-keyframes fadeIn {
			0% {
				-moz-transform: scale(0);
			}
			100% {
				-moz-transform: scale(1);
			}
		}

		@-o-keyframes fadeIn {
			0% {
				-o-tranform: scale(0);
			}
			100% {
				-o-tranform: scale(1);
			}
		}

		#container {
			padding: 0;
			cursor: pointer;
			border: none;
			font: inherit;
			outline: none;

			width: 56px;
			height: 56px;
			border-radius: 50%;
			transition: box-shadow 200ms ease-in-out, transform 300ms ease-in-out;
			transform: scale(1);
			color: ${props.color || theme.textOnNonbackground};
			fill: ${props.color || theme.textOnNonbackground};
			background-color: ${props.backgroundColor || theme.primary.main};
			${getShadow(3)}
		}

		${(!props.noFadeIn && !props.hide) ? html`
			#container {
				animation: fadeIn 250ms ease-in;
			}
		` : ''}

		#container.hidden {
			transform: scale(0);
		}

		#container:hover {
			${getShadow(4)}
		}

		#container:active {
			${getShadow(3)}
		}

		#rippleContainer {
			overflow: hidden;
			position: relative;
			width: 56px;
			height: 56px;
			border-radius: 50%;
		}
	</style>`
}, CHANGE_TYPE.ALWAYS);
