import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Search } from '../../../icons/search/search';
import { CustomDashboardCSS } from './dashboard.css';
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
						${props.metaPasswords && props.metaPasswords.length === 0 ?
							html`<md-card id="noPasswords" level="3">
								No passwords, click the add button to add some
							</md-card>` : html`
								<infinite-list custom-css="${CustomDashboardCSS.infiniteList}" 
									window id="infiniteList" data-name="password" 
									item-size="${this.getItemSize}"
									ref="${this}"
									data="${props.metaPasswords || []}"
								>
									<template slot="template">
										<password-preview id="password.id"
											websites="password.websites"
											username="password.username"
											twofactor_enabled="password.twofactor_enabled"
											u2f_enabled="password.u2f_enabled"
											selected="password_data.selected"
											index="_index"
											ref="_this"
										></password-preview>
									</template>
								</infinite-list>`
							}
					</div>
					<div id="passwordDetail">
						<div id="passwordDetailTop"></div>
						<password-detail id="passwordFocus"
							selected="${this.selectedPassword}"
							auth-data="${this.loginData}"
						></password-detail>
					</div>
				</div>
			</horizontal-centerer>
			<theme-selector id="themeSelector"></theme-selector>
			<div id="passwordFab">+</div>
		</div>`;
}, CHANGE_TYPE.PROP);