/// <reference path="../../../types/elements.d.ts" />
import { defineProps, PROP_TYPE, config, listen, isNewElement } from '../../../lib/webcomponent-util';
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
		this.updateClasses();
	}

	enable() {
		this.$.input!.disabled = false;
		this.updateClasses();
	}

	set(value: string, skipSet: boolean = false) {
		this.$.input!.value = value || '';
		if (!skipSet) {
			this.props.value = value || '';
		}

		const prevValidState = this._validityState;
		this.updateClasses();

		if (prevValidState !== this.valid) {
			this.fire('valid', this.valid);
		}
		this._validityState = this.valid;
	}

	get input() {
		return this.$.input!;
	}

	@bindToClass
	public updateClasses() {
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
	public onFocus() {
		this.$.container!.classList.add('is-focused');
	}

	@bindToClass
	public onBlur() {
		this.$.container!.classList.remove('is-focused');
	}

	@bindToClass
	public onReset() {
		this.updateClasses();
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

	@bindToClass
	public inputKeyDown(e: KeyboardEvent) {
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
	}

	postRender() {
		if (this.$.input && this.$.container) {
			this._validityState = this.valid;

			if (isNewElement(this.$.input)) {
				if (this.$.input.hasAttribute('placeholder')) {
					this.$.container.classList.add('has-placeholder');
				}

				if (this._maxRows !== -1) {
					listen(this, 'input', 'keydown', this._onKeyDown);
				}

				if (this.$.input.hasAttribute('autofocus')) {
					this.$.container.focus();
					this._checkFocus();
				}
				
				const isInvalid = this.$.container.classList.contains('is-invalid');
				this.updateClasses();
				if (isInvalid) {
					this.$.container.classList.add('is-invalid');
				}
			}
		}
	}
}