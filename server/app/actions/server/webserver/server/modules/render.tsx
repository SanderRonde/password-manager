import { renderToNodeStream } from 'react-dom/server';
import { ResponseCaptured } from './ratelimit';
import { html } from '../../client/src/html';
import React = require('react');

export function render(res: ResponseCaptured, {
	App, title, script, stylesheet	
}: {
	App: any;
	title: string;
	script: string;
	stylesheet: string;
}) {
	const { pre, post } = html({
		title,
		script,
		stylesheet
	});
	res.write(pre);

	const stream = renderToNodeStream(<App/>);

	stream.pipe(res, { end: false });
	stream.once('end', () => {
		res.end(post);
	});
}