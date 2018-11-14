import { changeOpacity } from '../../../lib/webcomponents/template-util';
import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { ProjectTheme } from '../../theming/theme/theme';
import { MoreInfo } from './more-info';

export const MoreInfoCSS = new TemplateFn<MoreInfo, ProjectTheme>(function (html, _props, theme) {
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
			background: ${changeOpacity(theme.text, 50)};
		}

		#circle:hover {
			background: ${changeOpacity(theme.text, 75)};
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
			background-color: ${changeOpacity(theme.text, 70)};
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