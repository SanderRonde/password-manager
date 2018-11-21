import { joinTemplates } from '../../../../lib/webcomponents/template-util';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Search } from '../../../icons/search/search';
import { CustomDashboardCSS } from './dashboard.css';
import { Dashboard } from './dashboard';

export const DashboardHTML = new TemplateFn<Dashboard>(function (html, props, _theme) {
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
						${props.newPassword !== null ? html`
						<div id="newPassword">
							<password-preview id="newPasswordPreview"
								#websites="${props.newPassword.websites}"
								username="${props.newPassword.username}"
								twofactor_enabled="${props.newPassword.twofactor_enabled}"
								u2f_enabled="${props.newPassword.u2f_enabled}"
								selected="${false}"
								index="-1"
							></password-preview>
						</div>
						` : ''}
						${props.metaPasswords ? '' : html`
							<infinite-list custom-css="${joinTemplates(
								CustomDashboardCSS.infiniteList,
								CustomDashboardCSS.templateList
							)}" 
								window id="placeholderList"
								#item-size="${() => this.getItemSize(null, {
									isMin: true
								})}"
								#ref="${this}"
								#data="${this.getPlaceholderList()}"
							>
								<template slot="template">
									<md-card level="3"
										padding-vertical="0"
										padding-horizontal="0"
									>
										<div class="templateContainer">
											<div class="templateIcon"></div>
											<div class="templateWebsite">
												<div class="templateLine"></div>
												<div class="templateLine"></div>
											</div>
											<div class="templateArrow">
												<div class="__hollow_arrow"></div>
											</div>
										</div>
									</md-card>
								</template>
							</infinite-list>
						`}
						${!(props.metaPasswords && props.metaPasswords.length === 0) ? '' : html`
							<md-card id="noPasswords" level="3">
								No passwords, click the add button to add some
							</md-card>
						`}
						${!(props.metaPasswords && props.metaPasswords.length) ? '' : html`
							<infinite-list custom-css="${CustomDashboardCSS.infiniteList}" 
								window id="infiniteList" data-name="password" 
								#item-size="${this.getItemSize}"
								#ref="${this}"
								#default-item-data="${{
									selected: false
								}}"
								#data="${props.metaPasswords || []}"
							>
								<template slot="template">
									<password-preview id="password.id"
										#websites="password.websites"
										username="password.username"
										twofactor_enabled="password.twofactor_enabled"
										u2f_enabled="password.u2f_enabled"
										selected="password_data.selected"
										index="_index"
										#ref="_this"
									></password-preview>
								</template>
							</infinite-list>
						`}
					</div>
					<div id="passwordDetail">
						<div id="passwordDetailTop"></div>
						<password-detail id="passwordFocus"
							#selected="${this.selectedPassword}"
							#auth-data="${this.loginData}"
							#ref="${this}"
						></password-detail>
					</div>
				</div>
			</horizontal-centerer>
			<theme-selector id="themeSelector"></theme-selector>
			<floating-action-button id="passwordFab"
				title="Add Password" aria-label="Add Password"
				@@click="${this.addPassword}"
			>
				<span id="passwordFabPlus">+</span>
			</floating-action-button>
		</div>`;
}, CHANGE_TYPE.PROP);