/// <reference path="../../../types/elements.d.ts" />
import { config, defineProps, PROP_TYPE } from "../../../lib/webcomponent-util";
import { ConfigurableWebComponent } from "../../../lib/webcomponents";
import { IconButtonIDMap } from "./icon-button-querymap";
import { IconButtonHTML } from "./icon-button.html";
import { IconButtonCSS } from "./icon-button.css";

@config({
	is: 'icon-button',
	css: IconButtonCSS,
	html: IconButtonHTML
})
export class IconButton extends ConfigurableWebComponent<IconButtonIDMap> { 
	props = defineProps(this, {
		reflect: {
			fill: {
				type: PROP_TYPE.STRING,
				exactType: '' as 'text'|'nontext',
				defaultValue: 'text'
			},
			ariaLabel: {
				type: PROP_TYPE.STRING,
				coerce: true
			}
		}
	})
}