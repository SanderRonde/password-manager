/// <reference path="../../../types/elements.d.ts" />
import { awaitMounted, createCancellableTimeout } from '../../../lib/webcomponents/template-util';
import { ConfigurableWebComponent, config, Props, PROP_TYPE } from "../../../lib/webcomponents";
import { LoadableBlockCSS, ANIMATE_TIME } from './loadable-block.css';
import { LoadableBlockIDMap } from './loadable-block-querymap';
import { LoadableBlockHTML } from './loadable-block.html';
import { wait } from "../../../lib/webcomponent-util";

@config({
	is: 'loadable-block',
	css: LoadableBlockCSS,
	html: LoadableBlockHTML
})
export class LoadableBlock extends ConfigurableWebComponent<LoadableBlockIDMap> {
	private __dimensions: {
		x: number;
		y: number;
	}|null = null;
	private __spinnerSize: number|null = null;
	props = Props.define(this, {
		reflect: {
			loading: PROP_TYPE.BOOL,
			spinnerSize: {
				type: PROP_TYPE.STRING,
				exactType:  '' as 'big'|'medium'|'regular'
			},
			spinnerDimensions: PROP_TYPE.NUMBER,
			clickThrough: PROP_TYPE.BOOL
		}
	});

	private get dimensions() {
		if (this.__dimensions) {
			return this.__dimensions;
		}
		const { width, height } = this.getBoundingClientRect();
		const xy = {
			x: width,
			y: height
		};
		return (this.__dimensions = xy);
	}

	private _calcSpinnerSize() {
		const { x, y } = this.dimensions;
		return Math.min(200, Math.floor(Math.min(x, y) / 6));
	}

	private get _spinnerSize() {
		if (this.__spinnerSize !== null) {
			return this.__spinnerSize;
		}
		return (this.__spinnerSize = this._calcSpinnerSize());
	}

	public getSpinnerSizes() {
		if (this.props.spinnerDimensions) {
			return {
				dimensions: ~~this.props.spinnerDimensions,
				big: false,
				medium: false
			}
		} 
		if (this.props.spinnerSize === 'big') {
			return {
				dimensions: 0,
				big: true,
				medium: false
			}
		}
		if (this.props.spinnerSize === 'medium') {
			return {
				dimensions: 0,
				big: false,
				medium: true
			}
		}
		if (this.props.spinnerSize === 'regular') {
			return {
				dimensions: 0,
				big: false,
				medium: false
			}
		}
		return {
			dimensions: this._spinnerSize,
			big: false,
			medium: false
		}
	}

	async load() {
		this.props.loading = true;
		await awaitMounted(this.$.spinner);
		this.$.spinner.start();
		this.$.spinnerContainer.classList.add('visible');
		await wait(0);
		this.$.spinnerContainer.classList.add('animate');
		await wait(ANIMATE_TIME);
	}

	async finish() {
		this.props.loading = false;
		this.$.spinnerContainer.classList.remove('animate');
		await createCancellableTimeout(this, 'finish', async () => {
			this.$.spinnerContainer.classList.remove('visible');
			await awaitMounted(this.$.spinner);
			this.$.spinner.stop();
		}, ANIMATE_TIME);
	}

	async layoutMounted() {
		await awaitMounted(this.$.spinner)
		if (this.props.loading) {
			this.$.spinner.start();
		} else {
			this.$.spinner.stop();
		}
	}

	mounted() {
		if (this.props.loading) {
			this.load();
		} else {
			this.finish();
		}
	}
}