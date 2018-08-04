import { theme } from "../../theming/theme/theme";
const css = (input: any) => input;

export const MaterialInputCSS = css(`<style>
	/** From https://github.com/google/material-design-lite/blob/mdl-1.x/src/textfield/_textfield.scss */
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
	.mdl-textfield {
		position: relative;
		font-size: 18px;
		display: inline-block;
		box-sizing: border-box;
		width: 300px;
		max-width: 100%;
		margin: 0;
		padding: 20px 0;
	}
	.mdl-textfield.fill {
		width: 100%;
	}
	.mdl-textfield .mdl-button {
		position: absolute;
		bottom: 20px;
	}

	.mdl-textfield--align-right {
		text-align: right;
	}

	.mdl-textfield--full-width {
		width: 100%;
	}

	.mdl-textfield--expandable {
		min-width: 32px;
		width: auto;
		min-height: 32px;
	}
	.mdl-textfield--expandable .mdl-button--icon {
		top: 16px;
	}

	#mainInputContainer {
		display: flex;
		flex-direction: row;
		justify-content: center;
		height: 27px;
	}

	.iconSlot {
		display: inline-block;
		border-bottom: 1px solid rgba(0,0,0, 0.12);
		margin-top: -10px;
	}

	.mdl-textfield__input {
		border: none;
		border-bottom: 1px solid rgba(0,0,0, 0.12);
		display: inline-block;
		font-size: 18px;
		font-family: "Helvetica", "Arial", sans-serif;
		margin: 0;
		padding: 4px 0;
		flex-grow: 100;
		background: none;
		text-align: left;
		color: inherit;
	}
	.mdl-textfield__input[type=number] {
		-moz-appearance: textfield;
	}
	.mdl-textfield__input[type=number]::-webkit-inner-spin-button, .mdl-textfield__input[type=number]::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.mdl-textfield.is-focused .mdl-textfield__input {
		outline: none;
	}
	.mdl-textfield.is-invalid .mdl-textfield__input {
		box-shadow: none;
		border-color: ${theme.error};
	}
	fieldset[disabled] .mdl-textfield .mdl-textfield__input, .mdl-textfield.is-disabled .mdl-textfield__input {
		background-color: transparent;
		border-bottom: 1px dotted rgba(0,0,0, 0.12);
		color: ${theme.minTextOnWhite};
	}

	.mdl-textfield textarea.mdl-textfield__input {
		display: block;
	}

	.mdl-textfield__label {
		bottom: 0;
		font-size: 18px;
		left: 0;
		right: 0;
		pointer-events: none;
		position: absolute;
		display: block;
		top: 24px;
		width: 100%;
		overflow: hidden;
		white-space: nowrap;
		text-align: left;
		color: ${theme.minTextOnWhite};
	}
	.mdl-textfield.is-dirty .mdl-textfield__label, .mdl-textfield.has-placeholder .mdl-textfield__label {
		visibility: hidden;
	}
	.mdl-textfield--floating-label .mdl-textfield__label {
		transition-duration: 0.2s;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
	}
	.mdl-textfield--floating-label.has-placeholder .mdl-textfield__label {
		transition: none;
	}
	fieldset[disabled] .mdl-textfield .mdl-textfield__label, .mdl-textfield.is-disabled.is-disabled .mdl-textfield__label {
		color: ${theme.minTextOnWhite};
	}
	.mdl-textfield--floating-label.is-focused .mdl-textfield__label, .mdl-textfield--floating-label.is-dirty .mdl-textfield__label, .mdl-textfield--floating-label.has-placeholder .mdl-textfield__label {
		font-size: 12px;
		top: 4px;
		visibility: visible;
		color: ${theme.primary.main};
	}
	.mdl-textfield--floating-label.is-focused .mdl-textfield__expandable-holder .mdl-textfield__label, .mdl-textfield--floating-label.is-dirty .mdl-textfield__expandable-holder .mdl-textfield__label, .mdl-textfield--floating-label.has-placeholder .mdl-textfield__expandable-holder .mdl-textfield__label {
		top: -16px;
	}
	.mdl-textfield--floating-label.is-invalid .mdl-textfield__label {
		font-size: 12px;
		color: ${theme.primary.main};
	}
	.mdl-textfield__label:after {
		bottom: 20px;
		content: "";
		height: 2px;
		left: 45%;
		position: absolute;
		transition-duration: 0.2s;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		visibility: hidden;
		width: 10px;
		background-color: ${theme.primary.main};
	}
	.mdl-textfield.is-focused .mdl-textfield__label:after {
		left: 0;
		visibility: visible;
		width: 100%;
	}
	.mdl-textfield.is-invalid .mdl-textfield__label:after {
		background-color: ${theme.error};
	}

	.mdl-textfield__error {
		position: absolute;
		font-size: 12px;
		margin-top: 3px;
		visibility: hidden;
		display: block;
		color: ${theme.error};
	}
	.mdl-textfield.is-invalid .mdl-textfield__error {
		visibility: visible;
	}

	.mdl-textfield__expandable-holder {
		display: inline-block;
		position: relative;
		margin-left: 32px;
		transition-duration: 0.2s;
		transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
		display: inline-block;
		max-width: 0.1px;
	}
	.mdl-textfield.is-focused .mdl-textfield__expandable-holder, .mdl-textfield.is-dirty .mdl-textfield__expandable-holder {
		max-width: 600px;
	}
	.mdl-textfield__expandable-holder .mdl-textfield__label:after {
		bottom: 0;
	}
</style>`);