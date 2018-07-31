import { RoutesDashboard } from "../routes/dashboard/routes-dashboard";
import { RoutesAPI } from "../routes/api/routes-api";
import { Webserver } from "../webserver";

export class WebserverRoutes {
	public Dashboard = new RoutesDashboard(this.parent);
	public API = new RoutesAPI(this.parent);

	constructor(private parent: Webserver) { }
}