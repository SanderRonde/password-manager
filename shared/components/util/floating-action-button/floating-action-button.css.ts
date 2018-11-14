import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { FloatingActionButton } from './floating-action-button';
import { ProjectTheme } from '../../theming/theme/theme';
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
		${RippleCSS.render(CHANGE_TYPE.ALWAYS, this)}
		${!props.noFloat ? floatCSS : ''}

		#container {
			padding: 0;
			cursor: pointer;
			border: none;
			font: inherit;
			outline: none;

			width: 56px;
			height: 56px;
			border-radius: 50%;
			transition: box-shadow 200ms ease-in-out;
			color: ${props.color || theme.textOnNonbackground};
			fill: ${props.color || theme.textOnNonbackground};
			background-color: ${props.backgroundColor || theme.primary.main};
			${getShadow(3)}
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
