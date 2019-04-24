/// <reference path="../../../types/elements.d.ts" />
import { IconButtonIDMap, IconButtonClassMap } from "./icon-button-querymap";
import { ConfigurableWebComponent, config, Props, PROP_TYPE } from "wclib";
import { IconButtonHTML } from "./icon-button.html";
import { IconButtonCSS } from "./icon-button.css";

@config({
	is: 'icon-button',
	css: IconButtonCSS,
	html: IconButtonHTML
})
export class IconButton extends ConfigurableWebComponent<{
	IDS: IconButtonIDMap;
	CLASSES: IconButtonClassMap;
}> { 
	props = Props.define(this, {
		reflect: {
			fill: {
				type: PROP_TYPE.STRING,
				exactType: '' as 'text'|'nontext',
				defaultValue: 'text'
			},
			ariaLabel: {
				type: PROP_TYPE.STRING,
				coerce: true
			},
			disabled: PROP_TYPE.BOOL
		}
	});

	constructor() {
		super();

		this.listenProp<this['props'], 'disabled'>('propChange', (name) => {
			if (name === 'disabled') {
				this._setButtonDisabledState();
			}
		});
	}

	layoutMounted() {
		this._setButtonDisabledState();
	}

	mounted() {
		this._setButtonDisabledState();
	}

	private _setButtonDisabledState() {
		if (this.props.disabled) {
			this.$.button.disabled = true;
		} else {
			this.$.button.disabled = false;
		}
	}
}