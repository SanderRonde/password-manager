/// <reference path="../../../types/elements.d.ts" />
import { defineProps, PROP_TYPE, config, listen } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from "../../../lib/webcomponents";
import { MaterialInputIDMap } from './material-input-querymap';
import { MaterialInputHTML } from './material-input.html';
import { MaterialInputCSS } from './material-input.css';
import { bindToClass } from '../../../lib/decorators';

//A lot of functions on this class are based on those in
// https://github.com/google/material-design-lite/tree/mdl-1.x/src/textfield
// so credit goes to the original authors

@config({
	is: 'material-input',
	css: MaterialInputCSS,
	html: MaterialInputHTML
})
export class MaterialInput extends ConfigurableWebComponent<MaterialInputIDMap, {
	valid: {
		args: [boolean]
	},
	keydown: {
		args: [KeyboardEvent]
	}
}> {
	private _validityState: boolean = true;
	private _maxRows: number = -1;

	props = defineProps(this, {
		reflect: {
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
		}
	});

	constructor() {
		super();

		this.listen('propChange', (key, _prevVal, newValue) => {
			if (key === 'value') {
				this.set(newValue, true);
			}
		});
	}

	get value() {
		return this.props.value;
	}

	get valid() {
		return this.$.input.validity.valid;
	}

	disable() {
		this.$.input!.disabled = true;
		this._updateClasses();
	}

	enable() {
		this.$.input!.disabled = false;
		this._updateClasses();
	}

	set(value: string, skipSet: boolean = false) {
		this.$.input!.value = value || '';
		if (!skipSet) {
			this.props.value = value || '';
		}

		const prevValidState = this._validityState;
		this._updateClasses();

		if (prevValidState !== this.valid) {
			this.fire('valid', this.valid);
		}
		this._validityState = this.valid;
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
			this._validityState = this.valid;

			listen(this, 'input', 'keydown', (e) => {
				window.setTimeout(() => {
					if (this.$.input) {
						this.props.value = this.$.input.value;
					}
					if (this._validityState !== this.valid) {
						this._validityState = this.valid;
						this.fire('valid', this.valid);
					}
					this.fire('keydown', e)
				}, 0);
			});

			if (this.$.input.hasAttribute('placeholder')) {
				this.$.container.classList.add('has-placeholder');
			}
			listen(this, 'input', 'input', this._updateClasses);
			listen(this, 'input', 'focus', this._onFocus);
			listen(this, 'input', 'blur', this._onBlur);
			listen(this, 'input', 'reset', this._onReset);
			if (this._maxRows !== -1) {
				listen(this, 'input', 'keydown', this._onKeyDown);
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