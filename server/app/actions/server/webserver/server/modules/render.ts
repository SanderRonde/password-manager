import { preAppHTML, postAppHTML } from '../../client/html';
import { ServerResponse } from './ratelimit';

export async function render(res: ServerResponse, {
	title, script, isDevelopment, data, rootElement
}: {
	data: any;
	title: string;
	script: string;
	rootElement: string;
	isDevelopment: boolean;
}) {
	res.write(preAppHTML({
		title,
		development: isDevelopment
	}));

	res.write(`<${rootElement}></${rootElement}/>`);
	res.write(`<textarea hidden>${JSON.stringify(data)}</textarea>`)

	res.write(postAppHTML({
		script
	}));

	res.end();
}