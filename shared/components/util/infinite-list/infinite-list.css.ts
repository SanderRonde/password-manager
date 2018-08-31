import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { InfiniteList } from './infinite-list';
import { html } from 'lit-html';

export const InfiniteListCSS = new TemplateFn<InfiniteList<any, any>>(function(_props, theme) {
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
			overflow-y: scroll;
			background-color: ${theme.background};
		}

		#focusCapturer {
			top: 0;
			left: 0;
			position: absolute;
			height: 0;
			width: 0;
		}
	</style>`;
}, CHANGE_TYPE.THEME);