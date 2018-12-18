import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { PaperDialog } from './paper-dialog';

export const PaperDialogHTML = new TemplateFn<PaperDialog>((html, props) => {
	return html`
		<div id="centerersContainer">
			<horizontal-centerer fullscreen>
				<vertical-centerer fullscreen>
					<dialog id="dialogSemantic">
						<md-card id="dialogContainer" level="3">
							<div id="dialogContent">
								${props.title ? html`
									<div id="dialogTitle">
										${props.title}
									</div>` : ''}
								<slot></slot>
							</div>
						</md-card>
					</dialog>
				</vertical-centerer>
			</horizontal-centerer>
		</div>
	`
}, CHANGE_TYPE.PROP);
