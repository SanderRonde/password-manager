/// <reference path="../../../types/elements.d.ts" />

import { config, defineProps, PROP_TYPE } from '../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { MoreInfoIDMap } from './more-info-querymap';
import { MoreInfoHTML } from './more-info.html';
import { MoreInfoCSS } from './more-info.css';

@config({
	is: 'more-info',
	css: MoreInfoCSS,
	html: MoreInfoHTML
})
export class MoreInfo extends ConfigurableWebComponent<MoreInfoIDMap> {
	public infoHeight: number = 0;

	props = defineProps(this, {
		reflect: {
			info: {
				type: PROP_TYPE.STRING,
				value: ''
			},
			openUp: PROP_TYPE.BOOL
		}
	});

	mounted() {
		this.infoHeight = this.$.info.scrollHeight;
		if (this.props.openUp) {
			this.renderToDOM();
		}
	}
}