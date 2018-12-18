import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { PaperDialog } from './paper-dialog';

export const PaperDialogHTML = new TemplateFn<PaperDialog>((html, props) => {
	return html`
		<div id="centerersContainer">
			<horizontal-centerer>
				<vertical-centerer fullscreen>
					<md-card id="dialogContainer">
						<div id="dialogContent">
							${props.title ? html`
								<div id="dialogTitle">
									${props.title}
								</div>` : ''}
							<slot></slot>
						</div>
					</md-card>
				</vertical-centerer>
			</horizontal-centerer>
		</div>
	`
}, CHANGE_TYPE.PROP);
