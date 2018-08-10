import { createThemedRules } from '../../../lib/webcomponent-util';
import { PaperButtonCSS } from '../paper-button/paper-button.css';
import { html } from "lit-html";

export const COLOR_FADE_TIME = 300;
export const FADE_IN_OUT_TIME = COLOR_FADE_TIME / 2;
export const AnimatedButtonCSS = html`<style>
	${PaperButtonCSS}

	#content > * {
		display: none;
		transition: opacity ${FADE_IN_OUT_TIME}ms ease-in-out;
	}

	#content > *.visible {
		display: block;
	}

	#content.fadeOut > * {
		opacity: 0;
	}

	#loadingContent {
		margin-top: 4px;
	}

	#successContent, #failureContent {
		fill: white;
	}

	#button {
		transition: background ${COLOR_FADE_TIME}ms ease-in-out;
	}

	#button${createThemedRules('.success', { 
		background: ['success']
	})}

	#button${createThemedRules('.failure', { 
		background: ['error']
	})}
</style>`;