import { config } from "../../../../lib/webcomponent-util";
import { ConfigurableWebComponent } from "../../../../lib/webcomponents";
import { html } from "lit-html";

@config({
	is: 'dashboard-page',
	css: null,
	html: () => html`<div>Dashboard</div>`
})
export class Dashboard extends ConfigurableWebComponent { }