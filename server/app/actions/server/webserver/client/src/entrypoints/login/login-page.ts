import { GlobalController } from "../../../../../../../../../shared/components/entrypoints/base/global/global-controller";
import { LoginWeb } from "../../../../../../../../../shared/components/entrypoints/web/login/login-web";
import { registerServiceWorker } from "../../../static/js/sw";

GlobalController.define();
LoginWeb.define();
registerServiceWorker();