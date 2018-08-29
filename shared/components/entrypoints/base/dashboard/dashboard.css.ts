import { genTemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { changeOpacity } from '../../../../lib/webcomponent-util';
import { Dashboard } from './dashboard';
import { html } from "lit-html";

const PAGE_TOP = 130;
export const TITLE_BAR_HEIGHT = 60;
export const MAX_PASSWORD_VIEW_SCROLL = 85;

export const CustomDashboardCSS = {
	searchInput: genTemplateFn<Dashboard>((theme) => html`<style>
		.mdl-textfield__input {
			color: ${theme.textOnNonbackground};
			border-bottom: none;
		}

		.iconSlot {
			border-bottom: none;
		}

		fieldset[disabled] .mdl-textfield .mdl-textfield__input, .mdl-textfield.is-disabled .mdl-textfield__input {
			border-bottom: none;
			color: ${theme.textOnNonbackground}
		}

		.mdl-textfield__label {
			color: ${changeOpacity(theme.textOnNonbackground, 60)};
		}

		.mdl-textfield--floating-label.has-placeholder .mdl-textfield__label {
			color: ${theme.textOnNonbackground}
		}
		.mdl-textfield--floating-label.is-focused .mdl-textfield__label, .mdl-textfield--floating-label.is-dirty .mdl-textfield__label, .mdl-textfield--floating-label.has-placeholder .mdl-textfield__label {
			color: transparent
		}
		.mdl-textfield--floating-label.is-invalid .mdl-textfield__label {
			color: transparent;
		}
		.mdl-textfield__label:after {
			background-color: transparent;
		}

		.mdl-textfield--floating-label.is-invalid .mdl-textfield__label {
			color: transparent;
		}

		#label {
			margin-left: 35px;
		}

		#input {
			margin-left: 10px;
			margin-top: 2px;
		}
	</style>`, CHANGE_TYPE.THEME),
	infiniteList: genTemplateFn<Dashboard>(() => html`<style>
		#contentContainer {
			overflow-y: hidden;
		}
	</style>`, CHANGE_TYPE.NEVER)
}

export const DashboardCSS = genTemplateFn<Dashboard>((_props, theme) => {
	return html`<style>
		#titleBar {
			width: 100vw;
			display: flex;
			flex-direction: row;
			justify-content: center;
			position: fixed;
			z-index: 100;
			${`background-color: ${theme.primary.main};`}
			${`height: ${TITLE_BAR_HEIGHT}px;`}
		}

		#searchInput, #pageContainer {
			width: 1000px;
			max-width: calc(100vw - 40px);
		}

		#searchBar {
			display: flex;
			flex-direction: row;
			justify-content: center;
			height: 40px;
			padding: 0 15px;
			margin-top: 10px;
			border-radius: 2px;
			width: 970px;
			max-width: calc(100vw - 70px);
			background-color: ${theme.primary.weak};
		}

		#searchInput {
			margin-top: -15px;
		}

		#searchIcon {
			margin-top: 13px;
			fill: ${theme.textOnNonbackground};
		}

		#themeSelector {
			position: fixed;
			bottom: 5px;
			right: 0;
		}

		#passwordList, #passwordFocus {
			width: 490px;
			background-color: grey;
		}

		#passwordFocus {
			max-height: calc(80vh - 70px);
			margin-left: 520px;
			position: absolute;
		}

		#passwordFocus.fixed {
			position: fixed;
			${`margin-top: -${PAGE_TOP - MAX_PASSWORD_VIEW_SCROLL}px;`}
		}

		#pageContainer {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			margin-bottom: 40px;
			${`margin-top: ${PAGE_TOP}px;`}
		}
	</style>`
}, CHANGE_TYPE.THEME);