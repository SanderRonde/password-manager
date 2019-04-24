import { PaperDialog, DISPLAY_MODE } from './paper-dialog';
import { TemplateFn, CHANGE_TYPE } from 'wclib';

export const PaperDialogHTML = new TemplateFn<PaperDialog>((html, props) => {
	return html`
		<div id="centerersContainer">
			<horizontal-centerer fullscreen>
				<vertical-centerer fullscreen>
					<dialog id="dialogSemantic" class="dialog">
						<md-card id="dialogContainer" level="3">
							<div id="dialogContent" class="${{
								fullscreen: props.mode === DISPLAY_MODE.FULLSCREEN
							}}">
								${props.title ? html`
									<div id="dialogTitle">
										${props.title}
									</div>` : ''}
								<slot name="content"></slot>
								<div id="buttons">
									<slot name="buttons"></slot>
								</div>
							</div>
						</md-card>
					</dialog>
				</vertical-centerer>
			</horizontal-centerer>
		</div>
	`
}, CHANGE_TYPE.PROP);
