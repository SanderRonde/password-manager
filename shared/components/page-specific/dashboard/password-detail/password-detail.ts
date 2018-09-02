/// <reference path="../../../../types/elements.d.ts" />

import { config, defineProps, ComplexType } from '../../../../lib/webcomponent-util';
import { MetaPasswords } from '../../../entrypoints/base/dashboard/dashboard';
import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { PasswordDetailIDMap } from './password-detail-querymap';
import { PasswordDetailHTML } from './password-detail.html';
import { PasswordDetailCSS } from './password-detail.css';

@config({
	is: 'password-detail',
	css: PasswordDetailCSS,
	html: PasswordDetailHTML
})
export class PasswordDetail extends ConfigurableWebComponent<PasswordDetailIDMap> {
	props = defineProps(this, {
		priv: {
			type: ComplexType<MetaPasswords[0]>()
		}
	});
}