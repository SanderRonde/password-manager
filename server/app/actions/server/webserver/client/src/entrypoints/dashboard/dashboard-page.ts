import { GlobalControllerWeb } from "../../../../../../../../../shared/components/entrypoints/web/global/global-controller-web";
import { DashboardWeb } from "../../../../../../../../../shared/components/entrypoints/web/dashboard/dashboard-web";
import { registerServiceWorker } from "../../../static/js/sw";

GlobalControllerWeb.define();
DashboardWeb.define();
registerServiceWorker();