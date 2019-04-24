import { GlobalControllerWeb } from "../../../../../../../../../shared/components/entrypoints/web/global/global-controller-web";
import { DashboardWeb } from "../../../../../../../../../shared/components/entrypoints/web/dashboard/dashboard-web";
import { theme } from "../../../../../../../../../shared/components/theming/theme/theme.es";
import { WebComponentThemeManger, WebComponentI18NManager } from "wclib";
import { registerServiceWorker } from "../../../static/js/sw";
import { directive, Part } from "lit-html";

WebComponentThemeManger.initTheme({
	theme: theme, 
	defaultTheme: 'light'
});
WebComponentI18NManager.initI18N({
	path: '/i18n/',
	defaultLang: 'en',
	returner: directive((promise: Promise<string>, content: string) => (part: Part) => {
		part.setValue(content);
		part.commit();
		promise.then((value) => {
			if (part.value === content) {
				part.setValue(value);
				part.commit();
			}
		});
	})
});
GlobalControllerWeb.define();
DashboardWeb.define();
registerServiceWorker();