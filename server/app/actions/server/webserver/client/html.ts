import { conditionalString } from "../../../../lib/util";

export function preAppHTML({
	title,
	development = false, 
	css = []
}: {
	title: string,
	development?: boolean;
	css?: string[];
}) {
	return `
<!DOCTYPE HTML>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
		<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"/>
		${conditionalString(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com">`,
			!development)}
		<meta name="theme-color" content="#455A64">
		<meta name="description" content="Your password manager dashboard">
		<title>${title}</title>
		<link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700" rel="stylesheet">
		<link href="/css/default.css" rel="stylesheet">
		${css.map((stylesheet) => {
			return `<style>\n${stylesheet}\n</style>`
		})}
	</head>
	<body ${conditionalString('class="dev"', development)}>
		<div id="app">`
}

export function postAppHTML({
	script
}: {
	script: string;
}) {
	return `</div>
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