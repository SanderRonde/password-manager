import { WebComponent, genIs, ComponentIs } from '../../../lib/webcomponent-util';
import { AnimatedButtonIDMap } from './animated-button-querymap';
import { AnimatedButtonHTML } from './animated-button.html';

export class AnimatedButton extends WebComponent<AnimatedButtonIDMap> {
	static is: ComponentIs = genIs('animated-button', AnimatedButton);
	renderer = AnimatedButtonHTML;
	loaded = true;
}

declare global {
	type HTMLAnimatedButtonElement = AnimatedButton;
}
export { AnimatedButtonHTML }
export { AnimatedButtonCSS } from './animated-button.css'