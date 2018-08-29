import { genTemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { Login } from './login';
import { html } from "lit-html";

export const LoginCSS = genTemplateFn<Login>((_props, theme) => {
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
			bottom: 5px;
			right: 0;
		}
	</style>`
}, CHANGE_TYPE.THEME);