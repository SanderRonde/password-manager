import { renderToNodeStream } from 'react-dom/server';
import { ResponseCaptured } from './ratelimit';
import { html } from '../../client/src/html';
import React = require('react');

export function render(res: ResponseCaptured, {
	App, title, script, stylesheet, development
}: {
	App: any;
	title: string;
	script: string;
	stylesheet: string;
	development: boolean;
}) {
	const { pre, post } = html({
		title,
		script,
		stylesheet,
		development
	});
	res.write(pre);

	const stream = renderToNodeStream(<App/>);

	stream.pipe(res, { end: false });
	stream.once('end', () => {
		res.end(post);
	});
}