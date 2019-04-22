import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Login } from './login';
import { isDark } from '../../../../lib/webcomponents/template-util';
import { mergeColors } from '../../../../lib/webcomponents/template-util/color';

export const DIALOG_FADE_TIME = 800;
export const KEY_TURN_TIME = 500;
export const SPLIT_TIME = 600;
export const LoginCSS = new TemplateFn<Login>((html, _props, theme) => {
	return html`<style>
		#formContainer {
			width: 400px;
			max-width: 100vw;
		}

		#buttonPositioner {
			display: flex;
			flex-direction: row;
			justify-content: flex-end;
		}

		#pageContainer {
			background-color: ${theme.background};
			transition: ${DIALOG_FADE_TIME}ms ease-out;
			opacity: 1;
		}

		#pageContainer.invisible {
			opacity: 0;
		}

		#pageContainer.hidden {
			display: none;
		}

		#lockAnimationKeySlot {
			transform: rotate(0);
			transition: transform ${KEY_TURN_TIME}ms ease-in-out;
		}

		#lockAnimationKeySlot.turned {
			transform: rotate(90deg);
		}

		#themeSelector {
			position: absolute;
			top: 5px;
			right: 0;
		}

		#lockAnimationTopHalf, #lockAnimationBottomHalf {
			height: 50vh;
			width: 100vw;
			position: absolute;
			overflow: hidden;
		}

		#lockAnimationContainer.animating #lockAnimationTopHalf,
		#lockAnimationContainer.animating #lockAnimationBottomHalf {
			transition: transform ${SPLIT_TIME}ms cubic-bezier(0.4, 0, 1, 1),
				background-color ${DIALOG_FADE_TIME + KEY_TURN_TIME + SPLIT_TIME}ms ease-in-out;
		}

		#lockAnimationContainer.split #lockAnimationTopHalf {
			transform: translateY(-50vh);
		}

		#lockAnimationContainer.split #lockAnimationBottomHalf {
			transform: translateY(50vh);
		}

		#lockAnimationContainer.hidden {
			display: none;
		}

		#lockAnimationBottomHalf, #lockAnimationTopHalf, #lockAnimationCircle {
			background-color: ${theme.background}
		}

		#lockAnimationBlock, #lockAnimationKeySlot {
			/** TODO: change  */
			background-color: #d9d9d9;
		}

		#lockAnimationRing {
			/** TODO: change  */
			border-color: #d9d9d9;
		}

		#lockAnimationBottomHalf {
			top: 50vh;
		}

		#lockAnimationRing {
			top: 50vh;
			margin-left: auto;
			margin-right: auto;
			margin-top: 50vh;
			width: 12vmin;
			height: 26vmin;
			transform: translateY(-50%);
			border-radius: 15vmin;
			border-width: 4vmin;
			border-style: solid;
		}

		#lockAnimationBlock {
			margin-left: auto;
			margin-right: auto;
			width: 26vmin;
			height: 17.5vmin;
			border-radius: 0px 0px 1vmin 1vmin;
		}

		.lockAnimationBlockCentererVertical {
			height: 100%;
			display: flex;
			flex-direction: column;
			justify-content: center;
		}

		#lockAnimationCircle {			
			width: 7vmin;
			height: 7vmin;
			margin-left: auto;
			margin-right: auto;
			border-radius: 50%;
		}

		#lockAnimationKeySlot {
			height: 3vmin;
			width: 1vmin;
			margin-left: auto;
			margin-right: auto;
			border-radius: 10px;
			transform: rotate(0);
		}

		@keyframes rotate-key-hole {
			0% {
				transform: rotate(0);
			}
			100% {
				transform: rotate(90deg);
			}
		}

		#lockAnimationContainer.animate {
			animation: rotate-key-hole 500ms ease-in-out;
		}

		#lockAnimationContainer.changeColor #lockAnimationBottomHalf, 
		#lockAnimationContainer.changeColor #lockAnimationTopHalf {
			background-color: ${mergeColors(theme.background, {
				r: 10,
				g: 10,
				b: 10
			}, !isDark(theme.background))}
		}

	</style>`
}, CHANGE_TYPE.THEME);