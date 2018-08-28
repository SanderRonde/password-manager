import { changeOpacity } from '../../../../lib/webcomponent-util';
import { Theme } from '../../../../types/shared-types';
import { Dashboard } from './dashboard';
import { html } from "lit-html";

export const CustomDashboardCSS = {
	searchInput: (theme: Theme) => html`<style>
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
	</style>`
}

export function DashboardCSS(this: Dashboard, theme: Theme, _props: Dashboard['props']) {
	return html`<style>
		/* #infiniteList {
			height: 80vh;
		} */

		#titleBar {
			height: 60px;
			width: 100vw;
			display: flex;
			flex-direction: row;
			justify-content: center;
			background-color: ${theme.primary.main};
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
			position: absolute;
			bottom: 5px;
			right: 0;
		}

		#passwordList, #passwordFocus {
			width: 490px;
			background-color: grey;
		}

		#pageContainer {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			margin-top: 70px;
		}
	</style>`
}