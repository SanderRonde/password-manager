import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Search } from '../../../icons/search/search';
import { CustomDashboardCSS } from './dashboard.css';
import * as devPasswords from './dev-passwords';
import { Dashboard } from './dashboard';

export const DashboardHTML = new TemplateFn<Dashboard>(function (props, _theme, html) {
	return html`
		<div id="container">
			<div id="titleBar">
				<div id="searchBar">
					<material-input no-floating-label id="searchInput" 
						custom-css="${CustomDashboardCSS.searchInput}"
						label="search websites" fill
					>
						<div id="searchIcon" slot="preIcon">${Search}</div>
					</material-input>
				</div>
			</div>
			<horizontal-centerer>
				<div id="pageContainer">
					<div id="passwordList">
						<div id="passwordTop"></div>
						<infinite-list custom-css="${CustomDashboardCSS.infiniteList}" 
							window id="infiniteList" data-name="password" 
							item-size="${this.getItemSize}"
							data="${
								(props.metaPasswords || []).length === 0 && 
									document.body.classList.contains('dev') ? 
										devPasswords.getDevPasswords() : (props.metaPasswords || [])
							}"
						>
							<template slot="template">
								<password-preview id="password.id"
									websites="password.websites"
									twofactor_enabled="password.twofactor_enabled"
								></password-preview>
							</template>
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