import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { AnimatedButton } from '../animated-button/animated-button';
import { changeOpacity } from '../../../lib/webcomponent-util';
import { RippleCSS } from '../../../mixins/ripple';
import { PaperButton } from './paper-button';
import { html } from "lit-html";

export const PaperButtonCSS = new TemplateFn<PaperButton|AnimatedButton>(function (_props, theme) {
	return html`<style>
		${RippleCSS.render(CHANGE_TYPE.THEME, this)}
		/**
		* Copyright 2015 Google Inc. All Rights Reserved.
		*
		* Licensed under the Apache License, Version 2.0 (the "License");
		* you may not use this file except in compliance with the License.
		* You may obtain a copy of the License at
		*
		*      http://www.apache.org/licenses/LICENSE-2.0
		*
		* Unless required by applicable law or agreed to in writing, software
		* distributed under the License is distributed on an "AS IS" BASIS,
		* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
		* See the License for the specific language governing permissions and
		* limitations under the License.
		*/
		.mdl-button {
			background: transparent;
			border: none;
			border-radius: 2px;
			color: rgb(0,0,0);
			position: relative;
			height: 36px;
			margin: 0;
			min-width: 64px;
			padding: 0 16px;
			display: inline-block;
			font-family: "Roboto", "Helvetica", "Arial", sans-serif;
			font-size: 14px;
			font-weight: 500;
			text-transform: uppercase;
			line-height: 1;
			letter-spacing: 0;
			overflow: hidden;
			will-change: box-shadow;
			transition: box-shadow 0.2s cubic-bezier(0.4, 0, 1, 1), background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
			outline: none;
			cursor: pointer;
			text-decoration: none;
			text-align: center;
			line-height: 36px;
			vertical-align: middle;
		}
		.mdl-button::-moz-focus-inner {
			border: 0;
		}
		.mdl-button:focus:not(:active) {
			background-color: rgba(0,0,0, 0.12);
		}
		.mdl-button:active {
			background-color: ${theme.primary.main};
		}
		.mdl-button.mdl-button--colored {
			color: ${theme.primary.main};
		}
		.mdl-button.mdl-button--colored:focus:not(:active) {
			background-color: rgba(0,0,0, 0.12);
		}

		input.mdl-button[type=submit] {
			-webkit-appearance: none;
		}
		.mdl-button--raised {
			box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.2), 0 1px 5px 0 rgba(0, 0, 0, 0.12);
			background: ${theme.primary.main};
			color: ${theme.textOnNonbackground};
		}
		.mdl-button--raised:active {
			box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
			background-color: ${theme.primary.main};
			color: ${theme.textOnNonbackground};
		}
		.mdl-button--raised:focus:not(:active) {
			box-shadow: 0 0 8px rgba(0, 0, 0, 0.18), 0 8px 16px rgba(0, 0, 0, 0.36);
			background-color: ${theme.primary.main};
			color: ${theme.textOnNonbackground};
		}
		.mdl-button--raised.mdl-button--colored {
			background: ${theme.primary.main};
			color: ${theme.textOnNonbackground};
		}
		.mdl-button--raised.mdl-button--colored:hover,
		.mdl-button--raised.mdl-button--colored:active
		.mdl-button--raised.mdl-button--colored:focus:not(:active) {
			background-color: ${theme.primary.main};
		}
		
		.mdl-button--fab {
			border-radius: 50%;
			font-size: 24px;
			height: 56px;
			margin: auto;
			min-width: 56px;
			width: 56px;
			padding: 0;
			overflow: hidden;
			box-shadow: 0 1px 1.5px 0 rgba(0, 0, 0, 0.12), 0 1px 1px 0 rgba(0, 0, 0, 0.24);
			position: relative;
			line-height: normal;
			background: ${theme.primary.weak};
		}
		.mdl-button--fab .material-icons {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-12px, -12px);
			line-height: 24px;
			width: 24px;
		}
		.mdl-button--fab.mdl-button--mini-fab {
			height: 40px;
			min-width: 40px;
			width: 40px;
		}
		.mdl-button--fab:active {
			box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
			background-color: ${theme.primary.main};
		}
		.mdl-button--fab:focus:not(:active) {
			box-shadow: 0 0 8px rgba(0, 0, 0, 0.18), 0 8px 16px rgba(0, 0, 0, 0.36);
			background-color: ${theme.primary.main};
		}
		.mdl-button--fab.mdl-button--colored {
			background: ${theme.accent.main};
			color: ${theme.textOnNonbackground};
		}
		.mdl-button--fab.mdl-button--colored:hover,
		.mdl-button--fab.mdl-button--colored:focus:not(:active),
		.mdl-button--fab.mdl-button--colored:active {
			background-color: ${theme.accent.main};	
		}

		.mdl-button--icon {
			border-radius: 50%;
			font-size: 24px;
			height: 32px;
			margin-left: 0;
			margin-right: 0;
			min-width: 32px;
			width: 32px;
			padding: 0;
			overflow: hidden;
			color: inherit;
			line-height: normal;
		}
		.mdl-button--icon .material-icons {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-12px, -12px);
			line-height: 24px;
			width: 24px;
		}
		.mdl-button--icon.mdl-button--mini-icon {
			height: 24px;
			min-width: 24px;
			width: 24px;
		}
		.mdl-button--icon.mdl-button--mini-icon .material-icons {
			top: 0px;
			left: 0px;
		}

		.mdl-button--primary.mdl-button--primary {
			color: ${theme.primary.main};
		}
		.mdl-button--primary.mdl-button--primary.mdl-button--raised, 
		.mdl-button--primary.mdl-button--primary.mdl-button--fab {
			color: ${theme.textOnNonbackground};
			background-color: ${theme.primary.main};
		}

		.mdl-button--accent.mdl-button--accent {
			color: ${theme.accent.main};
		}
		.mdl-button--accent.mdl-button--accent.mdl-button--raised, 
		.mdl-button--accent.mdl-button--accent.mdl-button--fab {
			color: ${theme.textOnNonbackground};
			background-color: ${theme.accent.main};
		}

		.mdl-button[disabled][disabled], .mdl-button.mdl-button--disabled.mdl-button--disabled {
			cursor: default;
			background-color: transparent;
		}
		.mdl-button--raised[disabled][disabled], .mdl-button--raised.mdl-button--disabled.mdl-button--disabled {
			box-shadow: none;
		}

		.mdl-button[disabled][disabled], .mdl-button.mdl-button--disabled.mdl-button--disabled {
			color: ${changeOpacity(theme.textOnBackground, 26)};
		}
		.mdl-button--fab[disabled][disabled], 
		.mdl-button--fab.mdl-button--disabled.mdl-button--disabled,
		.mdl-button--raised[disabled][disabled], 
		.mdl-button--raised.mdl-button--disabled.mdl-button--disabled {
			background-color: ${changeOpacity(theme.textOnBackground, 12)};
			color: ${changeOpacity(theme.textOnBackground, 26)};
		}

		.mdl-button--colored[disabled][disabled], 
		.mdl-button--colored.mdl-button--disabled.mdl-button--disabled {
			color: ${changeOpacity(theme.textOnBackground, 26)};
		}

		.mdl-button .material-icons {
			vertical-align: middle;
		}

		#button {
			padding: 4px 34px;
			font-weight: bold;
			font-size: 109%;
			border-radius: 5px;
			height: auto;
		}

		:host([small]) #button {
			padding: 0 20px;
			border-radius: 0;
		}
	</style>`
}, CHANGE_TYPE.THEME);