import { ProjectTheme } from '../../theming/theme/theme.es';
import { LoadableBlock } from './loadable-block';
import { CHANGE_TYPE, TemplateFn } from 'wclib';

export const ANIMATE_TIME = 500;
export const LoadableBlockCSS = new TemplateFn<LoadableBlock, ProjectTheme>((html, props, theme) => {
	return html`<style>
		:host {
			display: block;
		}

		#spinnerContainer {
			display: none;
			position: absolute;
			opacity: 0;
			width: 100vw;
			height: 100vh;
			z-index: 100;
			background-color: ${theme.background};
			transition: opacity ${ANIMATE_TIME}ms ease-in-out;
			${props.clickThrough ? 'pointer-events: none;' : ''}
		}

		#spinnerContainer.visible {
			display: block;
		}

		#spinnerContainer.animate {
			opacity: 1;
		}
	</style>`
}, CHANGE_TYPE.PROP | CHANGE_TYPE.THEME);