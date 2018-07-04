import { RoutesApiInstance } from "./instance/routes-api-instance";
import { RoutesApiPassword } from "./password/routes-api-password";
import { Webserver } from "../../webserver";
import { RoutesAPIAccount } from "./account/routes-api-account";

export class RoutesAPI {
	public Instance = new RoutesApiInstance(this.server);
	public Password = new RoutesApiPassword(this.server);
	public Account = new RoutesAPIAccount(this.server);

	constructor(public server: Webserver) { }
}