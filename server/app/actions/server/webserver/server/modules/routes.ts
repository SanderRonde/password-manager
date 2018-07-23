import { RoutesDashboard } from "../routes/dashboard/routes-dashboard";
import { Webserver } from "../webserver";
import { RoutesAPI } from "../routes/api/routes-api";

export class WebserverRoutes {
	public Dashboard = new RoutesDashboard(this.parent);
	public API = new RoutesAPI(this.parent);

	constructor(private parent: Webserver) { }
}