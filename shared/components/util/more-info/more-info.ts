/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent, config, Props, PROP_TYPE } from '../../../lib/webcomponents';
import { MoreInfoIDMap, MoreInfoClassMap } from './more-info-querymap';
import { MoreInfoHTML } from './more-info.html';
import { MoreInfoCSS } from './more-info.css';

const MORE_INFO_SPACING = 30;

@config({
	is: 'more-info',
	css: MoreInfoCSS,
	html: MoreInfoHTML
})
export class MoreInfo extends ConfigurableWebComponent<{
	IDS: MoreInfoIDMap;
	CLASSES: MoreInfoClassMap;
}> {
	public infoHeight: number = 0;

	props = Props.define(this, {
		reflect: {
			info: {
				type: PROP_TYPE.STRING,
				value: ''
			},
			openUp: {
				type: PROP_TYPE.BOOL,
				strict: true
			},
			auto: {
				type: PROP_TYPE.BOOL,
				strict: true,
				value: true
			}
		}
	});

	public getMode() {
		//If open-up is set to false, treat that as an override of auto
		if (this.props.auto && this.props.openUp === true) {
			//Prefer up
			if (this.getBoundingClientRect().top + this.infoHeight + MORE_INFO_SPACING > window.innerHeight) {
				return 'up';
			}
			return 'down';
		}
		if (this.props.openUp) {
			return 'up';
		}
		return 'down';
	}

	mounted() {
		this.infoHeight = this.$.info.scrollHeight;
		if (this.getMode() === 'down') {
			this.renderToDOM();
		}
	}
}