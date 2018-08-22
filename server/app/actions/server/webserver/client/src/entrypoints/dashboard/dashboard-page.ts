import { registerServiceWorker } from "../../../static/js/sw";
import { DashboardWeb } from "../../../../../../../../../shared/components/entrypoints/web/dashboard/dashboard-web";
import { GlobalController } from "../../../../../../../../../shared/components/entrypoints/global/global-controller";

GlobalController.define();
DashboardWeb.define();
registerServiceWorker();