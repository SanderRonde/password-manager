import { createMuiTheme, MuiThemeProvider, createGenerateClassName } from '@material-ui/core/styles';
import { preAppHTML, postAppHTML } from '../../client/src/html';
import blueGrey from '@material-ui/core/colors/blueGrey';
import indigo from '@material-ui/core/colors/indigo';
import { SheetsRegistry, JssProvider } from 'react-jss';
import { renderToString } from 'react-dom/server';
import { ResponseCaptured } from './ratelimit';
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
	res.write(preAppHTML({
		title,
		stylesheet,
		development
	}));

	const sheetsRegistry = new SheetsRegistry();
	const sheetsManager = new Map();

	const theme = createMuiTheme({
		palette: {
			primary: blueGrey,
			secondary: indigo,
			type: 'light'
		},
	});
	const generateClassName = createGenerateClassName();
	const html = renderToString(<JssProvider registry={sheetsRegistry} generateClassName={generateClassName}>
			<MuiThemeProvider theme={theme} sheetsManager={sheetsManager}>
				<App/>
			</MuiThemeProvider>
		</JssProvider>
	);

	res.write(html);

	const css = sheetsRegistry.toString()
	res.write(postAppHTML({
		css, script
	}));

	res.end();
}