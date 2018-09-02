import { TriangleArrowSize } from '../../../icons/triangle-arrow/triangle-arrow';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { PasswordPreview } from './password-preview';
import { html } from 'lit-html';
import { QuestionmarkSize } from '../../../icons/questionmark/questionmark';
import { LockClosedUnfilled } from '../../../icons/lockClosed/lockClosed';

function prefixWithWWW(url: string) {
	if (url.startsWith('www.')) {
		return url;
	}
	return `www.${url}`;
}
export const PasswordPreviewHTML = new TemplateFn<PasswordPreview>((props) => {
	return html`
		<md-card id="container" level="2"
			padding-vertical="0"
			padding-horizontal="0"
		>
			<div id="content">
				<div id="websites">
					${(props.websites || []).map((website) => {
						return html`
							<div class="website">
								<div class="icon">
									${website.favicon ? html`
										<img width="70" height="70" src="${website.favicon}"
											alt="${website.host + ' favicon'}"
											title="${website.host + ' favicon'}">
									` : html`
										<div class="noIcon">
											${QuestionmarkSize(70, 70)}
										</div>
									`}
								</div>
								<div class="urls">
									<div class="url" title="${website.exact}">
										${prefixWithWWW(website.host)}
									</div>
									<div title="Website username" class="username">
										${props.username}
									</div>
								</div>
							</div>
						`
					})}
				</div>
				<div id="pointer">
					${props.twofactor_enabled ? 
						html`<div id="twofactorEnabled"
							title="Twofactor authentication is enabled for this website"
						>
							${LockClosedUnfilled}
						</div>` : html``}
					<div id="arrow" title="View this password's details">
						${TriangleArrowSize(35, 35)}
					</div>
				</div>
			</div>
		</md-card>
	`
}, CHANGE_TYPE.PROP);