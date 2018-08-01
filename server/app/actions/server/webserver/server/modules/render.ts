import { preAppHTML, postAppHTML } from '../../client/html';
import { ResponseCaptured } from './ratelimit';

export function render(res: ResponseCaptured, {
	title, script, development, data, rootName
}: {
	data: any;
	title: string;
	script: string;
	rootName: string;
	development: boolean;
}) {
	res.write(preAppHTML({
		title,
		development
	}));

	res.write(`<${rootName}></${rootName}/>`);
	res.write(`<textarea hidden>${JSON.stringify(data)}</textarea>`)

	res.write(postAppHTML({
		script
	}));

	res.end();
}