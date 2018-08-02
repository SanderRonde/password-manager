import { WebComponent, defineProps, genIs, PROP_TYPE, classNames } from '../../lib/webcomponent-util';
import { html } from 'lit-html';
import { bindToClass } from '../../lib/decorators';
import { theme } from '../theming/theme';

const styles = html`<style>
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
		font-size: 16px;
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
		font-size: 16px;
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
		font-size: 16px;
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
</style>`;

export class MaterialInput extends WebComponent {
	static is = genIs('material-input', MaterialInput);
	private _maxRows: number = -1;

	props = defineProps(this, {
		label: {
			type: PROP_TYPE.STRING,
			defaultValue: '',
			coerce: true
		},
		value: {
			type: PROP_TYPE.STRING,
			watch: false,
			defaultValue: '',
			coerce: true
		},
		type: {
			type: PROP_TYPE.STRING,
			defaultValue: 'text',
			exactType: '' as 'text'|'password'|'email'|'tel'
		},
		noFloatingLabel: {
			type: PROP_TYPE.BOOL,
			defaultValue: false
		},
		pattern: PROP_TYPE.STRING,
		error: {
			type: PROP_TYPE.STRING,
			coerce: true
		},
		fill: PROP_TYPE.BOOL
	}, {}, this.__render);

	constructor() {
		super();
		this.__init();
	}

	@bindToClass
	private _updateClasses() {
		this._checkDisabled();
		this._checkValidity();
		this._checkDirty();
		this._checkFocus();
	}

	private _checkDisabled() {
		if (this._input!.disabled) {
			this._container!.classList.add('is-disabled');
		} else {
			this._container!.classList.remove('is-disabled');
		}
	}

	private _checkValidity() {
		if (this._input!.validity) {
			if (this._input!.validity.valid) {
			  	this._container!.classList.remove('is-invalid');
			} else {
			  	this._container!.classList.add('is-invalid');
			}
		}
	}

	private _checkDirty() {
		if (
			(this._input!.value && this._input!.value.length > 0) ||
			(this._input!.placeholder.trim() !== '')
		) {
			this._container!.classList.add('is-dirty');
		} else {
			this._container!.classList.remove('is-dirty');
		}
	}

	disable() {
		this._input!.disabled = true;
		this._updateClasses();
	}

	enable() {
		this._input!.disabled = false;
		this._updateClasses();
	}

	set(value: string) {
		this._input!.value = value || '';
		this._updateClasses();
	}

	@bindToClass
	private _onFocus() {
		this._container!.classList.add('is-focused');
	}

	@bindToClass
	private _onBlur() {
		this._container!.classList.remove('is-focused');
	}

	@bindToClass
	private _onReset() {
		this._updateClasses();
	}

	@bindToClass
	private _onKeyDown(event: KeyboardEvent) {
		var currentRowCount = this.props.value.split('\n').length;
		if (event.keyCode === 13) {
			if (currentRowCount >= this._maxRows) {
				event.preventDefault();
			}
		}
	}

	private _checkFocus() {
		if (!this._container) return;
		if (this._container.querySelector(':focus')) {
			this._container.classList.add('is-focused');
		} else {
			this._container.classList.remove('is-focused');
		}
	}

	private _container: HTMLElement|null = null;
	private _input: HTMLInputElement|null = null;
	__postRender() {
		this._container = this.$('#container');
		this._input = this.$('input') as HTMLInputElement;
		if (this._input && this._container) {
			this._input.onkeydown = () => {
				window.setTimeout(() => {
					if (this._input) {
						this.props.value = this._input.value;
					}
				}, 0);
			}

			if (this._input.hasAttribute('placeholder')) {
				this._container.classList.add('has-placeholder');
			}
			this._input.addEventListener('input', this._updateClasses);
			this._input.addEventListener('focus', this._onFocus);
			this._input.addEventListener('blur', this._onBlur);
			this._input.addEventListener('reset', this._onReset);
			if (this._maxRows !== -1) {
				this._input.addEventListener('keydown', this._onKeyDown);
			}

			const isInvalid = this._container.classList.contains('is-invalid');
			this._updateClasses();
			if (isInvalid) {
				this._container.classList.add('is-invalid');
			}
			if (this._input.hasAttribute('autofocus')) {
				this._container.focus();
				this._checkFocus();
			}
		}
	}

	render() {
		return html`
			${styles}
			<div id="container" class="${classNames(
				'mdl-textfield', 'mdl-js-textfield', {
					'mdl-textfield--floating-label': !this.props.noFloatingLabel,
					'fill': this.props.fill
				}
			)}">
				<div id="mainInputContainer">
					<slot class="iconSlot" name="preIcon"></slot>
					<input class="mdl-textfield__input" type="${this.props.type}" 
						id="input" value="${this.props.value}" 
						pattern="${this.props.pattern}">
					<slot class="iconSlot" name="postIcon"></slot>
				</div>
				<label class="mdl-textfield__label">${this.props.label}</label>
				<span class="mdl-textfield__error">${this.props.error}</span>
			</div>`;
	}
}