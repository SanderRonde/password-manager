import { GlobalControllerWeb } from "../../../../../../../../../shared/components/entrypoints/web/global/global-controller-web";
import { WebComponentThemeManger } from "../../../../../../../../../shared/lib/webcomponents/theme-manager";
import { LoginWeb } from "../../../../../../../../../shared/components/entrypoints/web/login/login-web";
import { theme } from "../../../../../../../../../shared/components/theming/theme/theme";
import { registerServiceWorker } from "../../../static/js/sw";

WebComponentThemeManger.setTheme(theme, 'light');
GlobalControllerWeb.define();
LoginWeb.define();
registerServiceWorker();