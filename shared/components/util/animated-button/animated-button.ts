import { WebComponent, genIs } from '../../../lib/webcomponent-util';
import { AnimatedButtonHTML } from './animated-button.html';

export class AnimatedButton extends WebComponent {
	static is = genIs('animated-button', AnimatedButton);
	renderer = AnimatedButtonHTML;
	loaded = true;
}

export { AnimatedButtonHTML }
export { AnimatedButtonCSS } from './animated-button.css'