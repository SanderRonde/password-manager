import { Theme } from '../../../../types/shared-types';
import { html } from "lit-html";
import { Login } from './login';

export function LoginCSS(this: Login, theme: Theme, _props: Login['props']) {
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
		}

		#themeSelector {
			position: absolute;
			top: 5px;
			right: 5px;
		}
	</style>`
}