import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { changeOpacity } from '../../../lib/webcomponent-util';
import { MoreInfo } from './more-info';
import { html } from 'lit-html';

export const MoreInfoCSS = new TemplateFn<MoreInfo>(function (_props, theme) {
	return html`<style>
		#letter {
			display: inline;
		}

		#circle {
			display: inline-block;
			width: 19px;
			text-align: center;
			border-radius: 50%;
			cursor: pointer;
			color: ${theme.background};
			background: ${changeOpacity(theme.textOnBackground, 50)};
		}

		#circle:hover {
			background: ${changeOpacity(theme.textOnBackground, 75)};
		}

		#hoverable {
			display: inline-block;
		}

		#info {
			position: absolute;
			margin-top: 3px;
			padding: 10px;
			font-size: 90%;
			z-index: 100;
			margin-left: -150px;
			width: 300px;
			transform: scale(0);
			transform-origin: top;
			transition: transform 200ms ease-in-out;
			background-color: ${changeOpacity(theme.textOnBackground, 70)};
			color: ${theme.textOnNonbackground};
		}

		${this.getMode() === 'up' ? '' : `
			#info {
				margin-top: -${this.infoHeight + 20}px;
				transform-origin: bottom;
			}
		`}

		#hoverable:hover #info {
			transform: scale(1);
		}
	</style>`
}, CHANGE_TYPE.THEME);