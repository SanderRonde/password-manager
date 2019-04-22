import { GlobalControllerWeb } from "../../../../../../../../../shared/components/entrypoints/web/global/global-controller-web";
import { DashboardWeb } from "../../../../../../../../../shared/components/entrypoints/web/dashboard/dashboard-web";
import { WebComponentThemeManger } from "../../../../../../../../../shared/lib/webcomponents/theme-manager";
import { WebComponentI18NManager } from "../../../../../../../../../shared/lib/webcomponents/i18n-manager";
import { theme } from "../../../../../../../../../shared/components/theming/theme/theme.es";
import { registerServiceWorker } from "../../../static/js/sw";

WebComponentThemeManger.initTheme({
	theme: theme, 
	defaultTheme: 'light'
});
WebComponentI18NManager.initI18N({
	path: '/i18n/',
	defaultLang: 'en'
});
GlobalControllerWeb.define();
DashboardWeb.define();
registerServiceWorker();