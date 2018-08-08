import { ConfigurableWebComponent, config } from "../../../../lib/webcomponent-util";
import { html } from "lit-html";

@config({
	is: 'dashboard-page',
	css: null,
	html: () => html`<div>Dashboard</div>`
})
export class Dashboard extends ConfigurableWebComponent { }