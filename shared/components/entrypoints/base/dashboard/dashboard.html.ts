import { Dashboard } from './dashboard';
import { html } from "lit-html";

export function DashboardHTML(this: Dashboard, _props: Dashboard['props']) {
	return html`
		${this.css}
		<div id="container">
			<div id="titleBar">
				<div id="searchBar">
					<material-input label="search websites" fill>
					</material-input>
				</div>
			</div>
			<div id="pageContainer">
				<div id="passwordList"></div>
				<div id="passwordFocus"></div>
			</div>
			<div id="passwordFab">+</div>
		</div>`;
}