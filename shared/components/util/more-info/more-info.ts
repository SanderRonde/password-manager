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
	props = defineProps(this, {
		reflect: {
			info: {
				type: PROP_TYPE.STRING,
				value: ''
			}
		}
	});
}