/// <reference path="../../../types/elements.d.ts" />
import { genIs, WebComponent, ComponentIs, WebComponentInterface } from "../../../lib/webcomponent-util";
import { IconButtonIDMap } from "./icon-button-querymap";
import { IconButtonHTML } from "./icon-button.html";

export class IconButton extends WebComponent<IconButtonIDMap> implements WebComponentInterface {
	static is: ComponentIs = genIs('icon-button', IconButton);
	static get cssProvider() {
		return import('./icon-button.css').then((mod) => {
			return mod.IconButtonCSS;
		});
	}
	renderer = IconButtonHTML;
	loaded = true;
}