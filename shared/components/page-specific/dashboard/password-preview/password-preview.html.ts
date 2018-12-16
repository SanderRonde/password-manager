import { HollowTriangleArrowSize } from '../../../icons/triangle-arrow/triangle-arrow';
import { QuestionmarkSize } from '../../../icons/questionmark/questionmark';
import { LockClosedUnfilled } from '../../../icons/lockClosed/lockClosed';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { invertedCardCSS, noCustomCSS } from './password-preview.css';
import { mapArr } from '../../../../lib/webcomponent-util';
import { PasswordPreview } from './password-preview';

function prefixWithWWW(url: string) {
	if (url.startsWith('www.') || url.startsWith('http')) {
		return url;
	}
	return `www.${url}`;
}
export const PasswordPreviewHTML = new TemplateFn<PasswordPreview>(function (html, props, _) {
	return html`
		<md-card id="container" level="3"
			padding-vertical="0"
			padding-horizontal="0"
			custom-css="${props.selected ? invertedCardCSS : noCustomCSS}"
			@click="${this.containerClick}"
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