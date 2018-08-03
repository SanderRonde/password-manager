import { defineProps, genIs, PROP_TYPE, WebComponent, ComponentIs } from '../../../lib/webcomponent-util';
import { MaterialInputHTML } from './material-input.html';
import { bindToClass } from '../../../lib/decorators';

export class MaterialInput extends WebComponent<{
	container: HTMLElement;
	input: HTMLInputElement;
	mainInputContainer: HTMLElement;
	label: HTMLLabelElement;
}> {
	static is: ComponentIs = genIs('material-input', MaterialInput);
	renderer = MaterialInputHTML;

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
	}, {});
	loaded = true;

	private _maxRows: number = -1;

	disable() {
		this.$.input!.disabled = true;
		this._updateClasses();
	}

	enable() {
		this.$.input!.disabled = false;
		this._updateClasses();
	}

	set(value: string) {
		this.$.input!.value = value || '';
		this._updateClasses();
	}

	get input() {
		return this.$.input!;
	}

	@bindToClass
	private _updateClasses() {
		this._checkDisabled();
		this._checkValidity();
		this._checkDirty();
		this._checkFocus();
	}

	private _checkDisabled() {
		if (this.$.input!.disabled) {
			this.$.container!.classList.add('is-disabled');
		} else {
			this.$.container!.classList.remove('is-disabled');
		}
	}

	private _checkValidity() {
		if (this.$.input!.validity) {
			if (this.$.input!.validity.valid) {
			  	this.$.container!.classList.remove('is-invalid');
			} else {
			  	this.$.container!.classList.add('is-invalid');
			}
		}
	}

	private _checkDirty() {
		if (
			(this.$.input!.value && this.$.input!.value.length > 0) ||
			(this.$.input!.placeholder.trim() !== '')
		) {
			this.$.container!.classList.add('is-dirty');
		} else {
			this.$.container!.classList.remove('is-dirty');
		}
	}

	@bindToClass
	private _onFocus() {
		this.$.container!.classList.add('is-focused');
	}

	@bindToClass
	private _onBlur() {
		this.$.container!.classList.remove('is-focused');
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
		if (!this.$.container) return;
		if (this.$.container.querySelector(':focus')) {
			this.$.container.classList.add('is-focused');
		} else {
			this.$.container.classList.remove('is-focused');
		}
	}

	postRender() {
		this.$.input = this.$.input;
		this.$.container = this.$.container;
		if (this.$.input && this.$.container) {
			this.$.input.onkeydown = () => {
				window.setTimeout(() => {
					if (this.$.input) {
						this.props.value = this.$.input.value;
					}
				}, 0);
			}

			if (this.$.input.hasAttribute('placeholder')) {
				this.$.container.classList.add('has-placeholder');
			}
			this.$.input.addEventListener('input', this._updateClasses);
			this.$.input.addEventListener('focus', this._onFocus);
			this.$.input.addEventListener('blur', this._onBlur);
			this.$.input.addEventListener('reset', this._onReset);
			if (this._maxRows !== -1) {
				this.$.input.addEventListener('keydown', this._onKeyDown);
			}

			const isInvalid = this.$.container.classList.contains('is-invalid');
			this._updateClasses();
			if (isInvalid) {
				this.$.container.classList.add('is-invalid');
			}
			if (this.$.input.hasAttribute('autofocus')) {
				this.$.container.focus();
				this._checkFocus();
			}
		}
	}
}

export { MaterialInputHTML };
export { MaterialInputCSS } from './material-input.css';