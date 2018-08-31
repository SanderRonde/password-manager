import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { PasswordPreview } from './password-preview';
import { html } from 'lit-html';

function prefixWithWWW(url: string) {
	if (url.startsWith('www.')) {
		return url;
	}
	return `www.${url}`;
}
export const PasswordPreviewHTML = new TemplateFn<PasswordPreview>((props) => {
	return html`
		<md-card>
			<div id="websites">
				${(props.websites || []).map((website) => {
					return html`
						<div class="website">
							<div class="icon">
								${website.favicon ? html`
									<img src="${website.favicon}">
								` : html`
									No icon
								`}
							</div>
							<div class="urls">
								<div class="url" title="${website.exact}">
									${prefixWithWWW(website.host)}
								</div>
								<div class="username">${props.username}</div>
							</div>
						</div>
					`
				})}
			</div>
			<div id="pointer">
				<div>2FA enabled: ${props.twofactor_enabled.toString()}</div>
			</div>
		</md-card>
	`
}, CHANGE_TYPE.PROP);