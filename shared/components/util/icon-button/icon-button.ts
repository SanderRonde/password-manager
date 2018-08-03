import { genIs, WebComponent, ComponentIs } from "../../../lib/webcomponent-util";
import { IconButtonIDMap } from "./icon-button-querymap";
import { IconButtonHTML } from "./icon-button.html";

export class IconButton extends WebComponent<IconButtonIDMap> {
	static is: ComponentIs = genIs('icon-button', IconButton);
	renderer = IconButtonHTML;
	loaded = true;
}

declare global {
	type HTMLIconButtonElement = IconButton;
}
export { IconButtonHTML, IconButtonIDMap }
export { IconButtonCSS } from './icon-button.css'