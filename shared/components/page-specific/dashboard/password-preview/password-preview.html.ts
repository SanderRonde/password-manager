import { HollowTriangleArrowSize } from '../../../icons/triangle-arrow/triangle-arrow';
import { QuestionmarkSize } from '../../../icons/questionmark/questionmark';
import { inlineListener, mapArr } from '../../../../lib/webcomponent-util';
import { LockClosedUnfilled } from '../../../icons/lockClosed/lockClosed';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { invertedCardCSS, noCustomCSS } from './password-preview.css';
import { PasswordPreview } from './password-preview';
import { Key } from '../../../icons/key/key';

function prefixWithWWW(url: string) {
	if (url.startsWith('www.')) {
		return url;
	}
	return `www.${url}`;
}
export const PasswordPreviewHTML = new TemplateFn<PasswordPreview>(function (props, _, html) {
	return html`
		<md-card id="container" level="3"
			padding-vertical="0"
			padding-horizontal="0"
			custom-css="${props.selected ? invertedCardCSS : noCustomCSS}"
			on-click="${inlineListener(this.containerClick, this)}"
		>
			<div id="content">
				<div id="websites">
					${mapArr((props.websites || []).map((website) => {
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
					}))}
				</div>
				<div id="pointer">
					${props.u2f_enabled ? html`<div id="u2fEnabled"
							title="U2F is enabled for this password"
						>
							${Key}
						</div>` : html``}
					${props.twofactor_enabled ? 
						html`<div id="twofactorEnabled"
							title="Twofactor authentication is enabled for this password"
						>
							${LockClosedUnfilled}
						</div>` : html``}
					<div id="arrow" title="View this password's details">
						${HollowTriangleArrowSize(35, 35)}
					</div>
				</div>
			</div>
		</md-card>
	`
}, CHANGE_TYPE.PROP);