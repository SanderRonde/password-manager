import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Search } from '../../../icons/search/search';
import * as devPasswords from './dev-passwords';
import { Dashboard } from './dashboard';
import { html } from "lit-html";

export const DashboardHTML = new TemplateFn<Dashboard>((props, _theme) => {
	return html`
		<div id="container">
			<div id="titleBar">
				<div id="searchBar">
					<material-input no-floating-label custom-css id="searchInput" label="search websites" fill>
						<div id="searchIcon" slot="preIcon">${Search}</div>
					</material-input>
				</div>
			</div>
			<horizontal-centerer>
				<div id="pageContainer">
					<div id="passwordList">
						<div id="passwordTop"></div>
						<infinite-list custom-css window id="infiniteList" data-name="password" 
							data="${
								encodeURIComponent(JSON.stringify(
									props.metaPasswords.length === 0 && 
										document.body.classList.contains('dev') ? 
											devPasswords.getDevPasswords() : props.metaPasswords))
							}"
						>
							<div slot="template">
								<md-card>x</md-card>
								<password-preview id="password.is"
									websites="password.websites"
									twofactor_enabled="password.twofactor_enabled"
								></password-preview>
							</div>
						</infinite-list>
					</div>
					<md-card id="passwordFocus" level="3">
						Select something
					</md-card>
				</div>
			</horizontal-centerer>
			<theme-selector id="themeSelector"></theme-selector>
			<div id="passwordFab">+</div>
		</div>`;
}, CHANGE_TYPE.PROP);