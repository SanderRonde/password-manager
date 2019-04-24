import { ANIMATE_TIME } from '../../../util/loadable-block/loadable-block.css';
import { ProjectTheme } from '../../../theming/theme/theme.es';
import { GlobalController } from './global-controller';
import { CHANGE_TYPE, TemplateFn } from 'wclib';

export const GlobalControllerCSS = new TemplateFn<GlobalController, ProjectTheme>((html, _props, _theme) => {
	return html`<style>
		#content .newpage.invisible {
			opacity: 1;
			display: block;
			transition: opacity ${ANIMATE_TIME}ms ease-in-out;
		}

		#content .newpage.hidden {
			display: none;
		}

		#content .newpage {
			opacity: 0;
		}

		#content {
			position: absolute;
		}
	</style>`
}, CHANGE_TYPE.NEVER);