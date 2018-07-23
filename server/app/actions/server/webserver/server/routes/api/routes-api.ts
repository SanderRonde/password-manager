import { RoutesApiInstance } from "./instance/routes-api-instance";
import { RoutesApiPassword } from "./password/routes-api-password";
import { RoutesAPIAccount } from "./account/routes-api-account";
import { Webserver } from "../../webserver";

export class RoutesAPI {
	public Instance = new RoutesApiInstance(this.server);
	public Password = new RoutesApiPassword(this.server);
	public Account = new RoutesAPIAccount(this.server);

	constructor(public server: Webserver) { }
}