import { GlobalControllerWeb } from "../../../../../../../../../shared/components/entrypoints/web/global/global-controller-web";
import { DashboardWeb } from "../../../../../../../../../shared/components/entrypoints/web/dashboard/dashboard-web";
import { WebComponentThemeManger } from "../../../../../../../../../shared/lib/webcomponents/theme-manager";
import { theme } from "../../../../../../../../../shared/components/theming/theme/theme";
import { registerServiceWorker } from "../../../static/js/sw";

WebComponentThemeManger.setTheme(theme, 'light');
GlobalControllerWeb.define();
DashboardWeb.define();
registerServiceWorker();