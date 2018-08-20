import { registerServiceWorker } from "../../../static/js/sw";
import { DashboardWeb } from "../../../../../../../../../shared/components/entrypoints/web/dashboard/dashboard-web";

DashboardWeb.define();
registerServiceWorker();