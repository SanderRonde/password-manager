export function preAppHTML({
	development, title
}: {
	title: string,
	development?: boolean;
}) {
	return `
<!DOCTYPE HTML>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
		<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"/>
		${development ? '' : `
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com">
		`}
		<meta name="theme-color" content="#455A64">
		<meta name="description" content="Your password manager dashboard">
		<title>${title}</title>
		<link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700" rel="stylesheet">
		<link href="/css/default.css" rel="stylesheet">
	</head>
	<body>
		<div id="app">`
}

export function postAppHTML({
	script
}: {
	script: string;
}) {
	return `</div>
		<script crossorigin src="https://unpkg.com/react@16/umd/react.production.min.js"></script>
		<script crossorigin src="https://unpkg.com/react-dom@16/umd/react-dom.production.min.js"></script>
		<script type="module" src="${script}"></script>
	</body>
	</html>`
}

export const html = ({ 
	title, script,
	development = false
}: { 
	title: string,
	script: string;
	development?: boolean;
}) => {
	return {
		pre: preAppHTML({
			development, title
		}),
		post: postAppHTML({
			script
		})
	}
}