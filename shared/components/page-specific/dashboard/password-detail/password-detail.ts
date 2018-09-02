/// <reference path="../../../../types/elements.d.ts" />

import { ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { PasswordDetailIDMap } from './password-detail-querymap';
import { PasswordDetailHTML } from './password-detail.html';
import { PasswordDetailCSS } from './password-detail.css';
import { config } from '../../../../lib/webcomponent-util';

@config({
	is: 'password-detail',
	css: PasswordDetailCSS,
	html: PasswordDetailHTML
})
export class PasswordDetail extends ConfigurableWebComponent<PasswordDetailIDMap> {
	
}