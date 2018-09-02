import * as fs from 'fs-extra';
import * as path from 'path';

function dashesToUppercase(name: string) {
	let newName = '';
	for (let i = 0; i < name.length; i++) {
		if (name[i] === '-') {
			newName += name[i + 1].toUpperCase();
			i++;
		} else {
			newName += name[i];
		}
	}
	return newName;
}

function capitalize(name: string) {
	return name[0].toUpperCase() + name.slice(1);
}

const indexTemplate = 
(name: string) => `/// <reference path="../../../types/elements.d.ts" />

import { ConfigurableWebComponent } from '../../../lib/webcomponents';
import { ${capitalize(dashesToUppercase(name))}IDMap } from './${name}-querymap';
import { ${capitalize(dashesToUppercase(name))}HTML } from './${name}.html';
import { ${capitalize(dashesToUppercase(name))}CSS } from './${name}.css';
import { config } from '../../../lib/webcomponent-util';

@config({
	is: '${name}',
	css: ${capitalize(dashesToUppercase(name))}CSS,
	html: ${capitalize(dashesToUppercase(name))}HTML
})
export class ${capitalize(dashesToUppercase(name))} extends ConfigurableWebComponent<${
	capitalize(dashesToUppercase(name))}IDMap> {
	
}`;

const htmlTemplate = 
(name: string) => `import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { html } from 'lit-html';

export const ${capitalize(dashesToUppercase(name))}HTML = new TemplateFn<${
	capitalize(dashesToUppercase(name))}>((_props) => {
	return html\`
		<div></div>
	\`
}, CHANGE_TYPE.PROP);
`;

const cssTemplate = 
(name: string) => `import { TemplateFn, CHANGE_TYPE } from '../../../lib/webcomponents';
import { html } from 'lit-html';

export const ${capitalize(dashesToUppercase(name))}CSS = new TemplateFn<${
	capitalize(dashesToUppercase(name))}>((_props) => {
		return html\`<style>
			
		</style>\`
	}, CHANGE_TYPE.PROP);
`;

(async () => {
	const name = process.argv[process.argv.length - 1];
	
	const cwd = process.cwd();
	const dir = path.join(cwd, name);

	//Create directory
	await fs.mkdirp(dir);

	//Create .ts file
	await fs.writeFile(path.join(dir, `${name}.ts`), indexTemplate(name), {
		encoding: 'utf8'
	});

	//Create .html.ts file
	await fs.writeFile(path.join(dir, `${name}.html.ts`), htmlTemplate(name), {
		encoding: 'utf8'
	});

	//Create .css.ts file
	await fs.writeFile(path.join(dir, `${name}.css.ts`), cssTemplate(name), {
		encoding: 'utf8'
	});
})();