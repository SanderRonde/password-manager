import { TemplateFn, CHANGE_TYPE } from '../base';
import { mapArr } from '../../webcomponent-util';
import { WebComponent } from '../component';
import { html } from 'lit-html';

export function joinTemplates<T extends WebComponent<any>>(...templates: TemplateFn<T>[]): TemplateFn<T> {
	const changeType = templates.reduce((prev, template) => {
		if (template.changeOn === CHANGE_TYPE.ALWAYS ||
			prev === CHANGE_TYPE.ALWAYS) {
				return CHANGE_TYPE.ALWAYS
			}
		if (template.changeOn === CHANGE_TYPE.PROP || 
			template.changeOn === CHANGE_TYPE.THEME) {
				if (prev === CHANGE_TYPE.NEVER) {
					return template.changeOn;
				}
				if (template.changeOn !== prev) {
					return CHANGE_TYPE.ALWAYS;
				}
				return prev;
			}
		if (prev === CHANGE_TYPE.PROP ||
			prev === CHANGE_TYPE.THEME) {
				return prev;
			}
		return CHANGE_TYPE.NEVER;
	}, CHANGE_TYPE.NEVER);
	return new TemplateFn<T>(function () {
		return html`
			${mapArr(templates.map((template) => {
				return template.render(changeType, this);
			}))}
		`;
	}, changeType as any);
}