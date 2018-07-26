export function preAppHTML({
	development, title, stylesheet	
}: {
	title: string,
	stylesheet: string;
	development?: boolean;
}) {
	return `
<!DOCTYPE HTML>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
		${development ? '' : `
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com">
		`}
		<meta name="theme-color" content="#455A64">
		<meta name="description" content="Your password manager dashboard">
		<title>${title}</title>
		<link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700" rel="stylesheet">
		<link rel="stylesheet" href="${stylesheet}"/>
	</head>
	<body>
		<div id="app">`
}

export function postAppHTML({
	css, script
}: {
	css: string;
	script: string;
}) {
	return `</div>
		<style id="jss-server-side">${css}</style>
		<script crossorigin src="https://unpkg.com/react@16/umd/react.production.min.js"></script>
		<script crossorigin src="https://unpkg.com/react-dom@16/umd/react-dom.production.min.js"></script>
		<script type="module" src="${script}"></script>
	</body>
	</html>`
}

export const html = ({ 
	title, script, stylesheet, css,
	development = false
}: { 
	css: string;
	title: string,
	script: string;
	stylesheet: string;
	development?: boolean;
}) => {
	return {
		pre: preAppHTML({
			development, title, stylesheet
		}),
		post: postAppHTML({
			script, css
		})
	}
}