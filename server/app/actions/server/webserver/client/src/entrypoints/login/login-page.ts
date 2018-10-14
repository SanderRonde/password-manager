import { GlobalControllerWeb } from "../../../../../../../../../shared/components/entrypoints/web/global/global-controller-web";
import { LoginWeb } from "../../../../../../../../../shared/components/entrypoints/web/login/login-web";
import { registerServiceWorker } from "../../../static/js/sw";

GlobalControllerWeb.define();
LoginWeb.define();
registerServiceWorker();