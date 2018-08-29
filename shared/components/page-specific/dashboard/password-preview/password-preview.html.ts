import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { PasswordPreview } from './password-preview';
import { html } from 'lit-html';

export const PasswordPreviewHTML = new TemplateFn<PasswordPreview>((props) => {
	return html`
		<md-card>
			<div>ID: ${props.id}</div>
			<div>
				${props.websites.map((website) => {
					return html`
						<div>host: ${website.host}</div>
						<div>exact: ${website.exact}</div>
						<div>favicon: ${website.favicon}</div>
					`
				})}
			</div>
			<div>2FA enabled: ${props.twofactor_enabled.toString()}</div>
		</md-card>
	`
}, CHANGE_TYPE.PROP);