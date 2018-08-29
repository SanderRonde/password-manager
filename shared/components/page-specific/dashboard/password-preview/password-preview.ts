/// <reference path="../../../../types/elements.d.ts" />

import { config, defineProps, PROP_TYPE, JSONType } from '../../../../lib/webcomponent-util';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { PasswordPreviewHTML } from './password-preview.html';
import { PasswordPreviewCSS } from './password-preview.css';
import { MDCard } from '../../../util/md-card/md-card';

@config({
	is: 'password-preview',
	css: PasswordPreviewCSS,
	html: PasswordPreviewHTML,
	dependencies: [
		MDCard
	]
})
export class PasswordPreview extends ConfigurableWebComponent<{}> {
	props = defineProps(this, {
		reflect: {
			id: PROP_TYPE.STRING,
			websites: {
				type: JSONType<{
					host: string;
					exact: string;
					favicon: string|null;	
				}[]>()
			},
			twofactor_enabled: PROP_TYPE.BOOL
		}
	});
}