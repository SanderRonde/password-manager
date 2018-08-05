/// <reference path="../../../types/elements.d.ts" />
import { ConfigurableWebComponent, config } from "../../../lib/webcomponent-util";
import { IconButtonIDMap } from "./icon-button-querymap";
import { IconButtonHTML } from "./icon-button.html";
import { IconButtonCSS } from "./icon-button.css";

@config({
	is: 'icon-button',
	css: IconButtonCSS,
	html: IconButtonHTML
})
export class IconButton extends ConfigurableWebComponent<IconButtonIDMap> { }