import { changeOpacity } from '../../../../lib/webcomponents/template-util';
import { pythagoras } from '../../../icons/triangle-arrow/triangle-arrow';
import { InfiniteList } from '../../../util/infinite-list/infinite-list';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Dashboard } from './dashboard';

const PAGE_TOP = 130;
export const TITLE_BAR_HEIGHT = 60;
export const PW_VIEW_SCROLL = 85;

export const CustomDashboardCSS = {
	searchInput: new TemplateFn<Dashboard>((html, _props, theme) => html`<style>
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
	infiniteList: new TemplateFn<InfiniteList<any, any, any>>((html, _props, _theme) => html`<style>
		#contentContainer {
			overflow-y: hidden;
		}

		.container {
			margin-bottom: 20px;
			margin-left: 5px;
		}
	</style>`, CHANGE_TYPE.NEVER),
	templateList: new TemplateFn<InfiniteList<any, any, any>>((html, _props, theme) => {
		const color = changeOpacity(theme.textOnBackground, 25);
		const actualWidth = pythagoras(35);
		const actualHeight = pythagoras(35);
		const widthPart = actualWidth / 4;
		const heightPart = actualHeight / 4;
		return html`<style>
			.templateContainer {
				width: 435px;
				height: 70px;
				padding: 10px 15px;
				display: -webkit-flex;
				display: flex;
				flex-direction: row;
				-webkit-justify-content: space-between;
				justify-content: space-between;
				color: ${color};
			}

			.templateIcon {
				width: 70px;
				height: 70px;
				border-radius: 50%;
				background-color: ${color};
			}

			.templateWebsite {
				display: -webkit-flex;
				display: flex;
				flex-direction: column;
				-webkit-justify-content: space-around;
				justify-content: space-around;
				flex-grow: 100;
			}

			.templateLine {
				height: 1em;
				margin: 0 20px;
				display: -webkit-flex;
				display: flex;
				flex-direction: column;
				-webkit-justify-content: space-around;
				justify-content: space-around;
				background-color: ${color};
			}

			.templateArrow {
				display: -webkit-flex;
				display: flex;
				flex-direction: column;
				-webkit-justify-content: space-around;
				justify-content: space-around;
			}

			.__hollow_arrow {
				border-right: ${widthPart}px solid ${color};
				border-bottom: ${heightPart}px solid ${color};
				width: ${widthPart * 3}px;
				height: ${heightPart * 3}px;
				transform: rotate(-45deg);
			}
		</style>`
	}, CHANGE_TYPE.THEME)
}

export const DashboardCSS = new TemplateFn<Dashboard>((html, _props, theme) => {
	return html`<style>
		#container {
			background-color: ${theme.background};
		}

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
			width: 480px;
			background-color: grey;
		}

		#passwordDetail {
			max-height: calc(80vh - 70px);
			margin-left: 520px;
			position: absolute;
		}

		#passwordDetail.fixed {
			position: fixed;
			${`margin-top: -${PAGE_TOP - PW_VIEW_SCROLL}px;`}
		}

		#pageContainer {
			display: flex;
			flex-direction: row;
			justify-content: space-between;
			margin-bottom: 40px;
			${`margin-top: ${PAGE_TOP}px;`}
		}

		#passwordFocus {
			display: block;
		}

		#noPasswords {
			font-size: 130%;
			font-weight: 500;
		}
	</style>`
}, CHANGE_TYPE.THEME);