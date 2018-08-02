import { genIs, WebComponent } from "../../../lib/webcomponent-util";
import { IconButtonHTML } from "./icon-button.html";

export class IconButton extends WebComponent {
	static is = genIs('icon-button', IconButton);
	renderer = IconButtonHTML;
	loaded = true;
}

export { IconButtonHTML }
export { IconButtonCSS } from './icon-button.css'