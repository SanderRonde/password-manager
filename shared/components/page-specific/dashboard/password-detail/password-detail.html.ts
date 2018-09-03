import { LockClosedUnfilledSize } from '../../../icons/lockClosed/lockClosed';
import { TemplateFn, CHANGE_TYPE } from '../../../../lib/webcomponents';
import { PasswordDetail } from './password-detail';
import { html } from 'lit-html';

export const PasswordDetailHTML = new TemplateFn<PasswordDetail>((_props) => {
	return html`
		<div>
			<md-card level="3" 
				padding-vertical="0"
				padding-horizontal="0"
			>
				<sizing-block>
					<div id="noneSelectedView">
						<vertical-centerer>
							<horizontal-centerer>
								<div id="noneSelectedContent">
									<div id="noneSelectedLock">
										${LockClosedUnfilledSize(250)}
									</div>
									<div id="noneSelectedText">
										Select a password
									</div>
								</div>
							</horizontal-centerer>
						</vertical-centerer>
					</div>
				</sizing-block>
			</md-card>
		</div>
	`
}, CHANGE_TYPE.PROP);