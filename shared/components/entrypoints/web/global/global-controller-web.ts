import { GlobalController, GlobalControllerDependencies } from '../../base/global/global-controller';
import { GlobalControllerHTML } from '../../base/global/global-controller.html';
import { GlobalControllerCSS } from '../../base/global/global-controller.css';
import { ENTRYPOINT } from '../../../../types/shared-types';
import { config } from 'wclib';

@config({
	is: 'global-controller',
	css: GlobalControllerCSS,
	html: GlobalControllerHTML,
	dependencies: GlobalControllerDependencies
})
export class GlobalControllerWeb extends GlobalController {
	public loadEntrypoint(page: ENTRYPOINT) {
		const entrypoint = this._getEntrypointValue(page);
		if (customElements.get(`${entrypoint}-page`)) {
			return;
		}
		const src = `/entrypoints/${entrypoint}/${entrypoint}-page.js`;
		const script = document.createElement('script');
		if (document.body.classList.contains('dev')) {
			script.type = 'module';
		}
		script.src = src;
		document.body.appendChild(script);
	}
}