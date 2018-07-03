import { RoutesApiInstance } from "./instance/routes-api-instance";
import { RoutesApiPassword } from "./password/routes-api-password";
import { Webserver } from "../../webserver";

export class RoutesAPI {
	public Instance = new RoutesApiInstance(this.server);
	public Password = new RoutesApiPassword(this.server);

	constructor(public server: Webserver) { }
}