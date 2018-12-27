import { AnimationDescriptor } from './animation';

const ANIMATION_DURATION = 300;
export class SlideInAnimation<T extends HTMLElement> extends AnimationDescriptor<T> {
	layoutMounted(root: HTMLElement) {
		//Hide it for a bit
		root.style.display = 'none';
	}

	mounted(root: HTMLElement) {
		//Make it visible again
		root.style.display = 'block';

		//Start the animation
		root.animate([{
			transform: 'translateY(-60px)'
		}, {
			transform: 'translateY(0)'
		}], {
			easing: 'linear',
			fill: 'forwards',
			duration: ANIMATION_DURATION
		});

		root.animate([{
			opacity: '0'
		}, {
			opacity: '1'
		}], {
			easing: 'ease-in',
			fill: 'forwards',
			duration: ANIMATION_DURATION
		});
	}

	unmounted() {
		console.log('was unmounted');
	}
}