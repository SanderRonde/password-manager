import { createMuiTheme, MuiThemeProvider, createGenerateClassName } from '@material-ui/core/styles';
import { preAppHTML, postAppHTML } from '../../client/src/html';
import blueGrey from '@material-ui/core/colors/blueGrey';
import indigo from '@material-ui/core/colors/indigo';
import { SheetsRegistry, JssProvider } from 'react-jss';
import { renderToString } from 'react-dom/server';
import { ResponseCaptured } from './ratelimit';
import * as React from 'react'

export function render(res: ResponseCaptured, {
	App, title, script, development
}: {
	App: React.ComponentType;
	title: string;
	script: string;
	development: boolean;
}) {
	res.write(preAppHTML({
		title,
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
	const html = renderToString(
		<JssProvider registry={sheetsRegistry} generateClassName={createGenerateClassName({
			dangerouslyUseGlobalCSS: true
		})}>
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