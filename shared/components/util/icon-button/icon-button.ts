/// <reference path="../../../types/elements.d.ts" />
import { ConfigurableWebComponent } from "../../../lib/webcomponents";
import { IconButtonIDMap } from "./icon-button-querymap";
import { IconButtonHTML } from "./icon-button.html";
import { IconButtonCSS } from "./icon-button.css";
import { config } from "../../../lib/webcomponent-util";

@config({
	is: 'icon-button',
	css: IconButtonCSS,
	html: IconButtonHTML
})
export class IconButton extends ConfigurableWebComponent<IconButtonIDMap> { }