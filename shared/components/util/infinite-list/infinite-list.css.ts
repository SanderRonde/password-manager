import { ProjectTheme } from '../../theming/theme/theme.es';
import { TemplateFn, CHANGE_TYPE } from 'wclib';
import { InfiniteList } from './infinite-list';

export const InfiniteListCSS = new TemplateFn<InfiniteList<any, any, any>, ProjectTheme>(function(html, _props, theme) {
	return html`<style>
		:host {
			display: flex;
			flex-direction: column;
		}

		.hidden {
			display: none;
		}

		.container {
			top: 0;
			position: absolute;
		}

		#contentContainer {
			display: flex;
			position: relative;
			background-color: ${theme.background};
		}

		#focusCapturer {
			top: 0;
			left: 0;
			position: fixed;
			height: 0;
			width: 0;
		}

		#physicalContent .click-capture {
			pointer-events: none;
			width: 100%;
			height: 100%;
			background-color: transparent;
			position: absolute;
		}

		#physicalContent.disabled .click-capture {
			pointer-events: all;
		}
	</style>`;
}, CHANGE_TYPE.THEME);