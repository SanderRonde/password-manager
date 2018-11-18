/// <reference path="../../../../types/elements.d.ts" />

import { config, ConfigurableWebComponent } from '../../../../lib/webcomponents';
import { PasswordCreateIDMap } from './password-create-querymap';
import { PasswordCreateHTML } from './password-create.html';
import { PasswordCreateCSS } from './password-create.css';

@config({
	is: 'password-create',
	css: PasswordCreateCSS,
	html: PasswordCreateHTML
})
export class PasswordCreate extends ConfigurableWebComponent<PasswordCreateIDMap> {
	
}