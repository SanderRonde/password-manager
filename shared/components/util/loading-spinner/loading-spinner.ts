/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent, config, Props, PROP_TYPE, isNewElement } from "wclib";
import { LoadingSpinnerIDMap, LoadingSpinnerClassMap } from "./loading-spinner-querymap";
import { LoadingSpinnerHTML } from "./loading-spinner.html";
import { LoadingSpinnerCSS } from "./loading-spinner.css";

@config({
	is: 'loading-spinner',
	css: LoadingSpinnerCSS,
	html: LoadingSpinnerHTML
})
export class LoadingSpinner extends ConfigurableWebComponent<{
	IDS: LoadingSpinnerIDMap;
	CLASSES: LoadingSpinnerClassMap;
}> {
	props = Props.define(this, {
		reflect: {
			big: PROP_TYPE.BOOL,
			medium: PROP_TYPE.BOOL,
			dimensions: PROP_TYPE.NUMBER
		}
	})

	start() {
		this.$.container.classList.add('is-active');
	}

	stop() {
		this.$.container.classList.remove('is-active');
	}

	private _createLayer(index: number) {
		var layer = document.createElement('div');
		layer.classList.add('mdl-spinner__layer');
		layer.classList.add('mdl-spinner__layer' + '-' + index);

		var leftClipper = document.createElement('div');
		leftClipper.classList.add('mdl-spinner__circle-clipper');
		leftClipper.classList.add('mdl-spinner__left');

		var gapPatch = document.createElement('div');
		gapPatch.classList.add('mdl-spinner__gap-patch');

		var rightClipper = document.createElement('div');
		rightClipper.classList.add('mdl-spinner__circle-clipper');
		rightClipper.classList.add('mdl-spinner__right');

		var circleOwners = [leftClipper, gapPatch, rightClipper];

		for (var i = 0; i < circleOwners.length; i++) {
			var circle = document.createElement('div');
			circle.classList.add('mdl-spinner__circle');
			circleOwners[i].appendChild(circle);
		}

		layer.appendChild(leftClipper);
		layer.appendChild(gapPatch);
		layer.appendChild(rightClipper);

		this.$.container.appendChild(layer);
	}

	postRender() {
		if (isNewElement(this.$.container)) {
			for (var i = 1; i <= 4; i++) {
				this._createLayer(i);
			}
		
			this.$.container.classList.add('is-upgraded');
		}
	}
}