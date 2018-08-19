import { INLINED_FILES, getFileContent, setBasePath } from "../server/modules/resolveServerFile";
import { conditionalString } from "../../../../lib/util";

export const DEFAULT_FILES: {
	css: {
		name: string;
	}[];
	scripts: {
		name: string;
		isModule?: boolean;
	}[];
} = {
	css: [],
	scripts: []
}

async function getInlinedCSS() {
	return Promise.all(INLINED_FILES.css.map((file) => {
		return getFileContent(file);
	}))
}

export async function preAppHTML({
	title,
	css = [],
	bodyStyles = '',
	development = false, 
	stylesheets = []
}: {
	css?: string[];
	title: string,
	bodyStyles?: string;
	development?: boolean;
	stylesheets?: string[];
}) {
	setBasePath(development);
	
	return `
<!DOCTYPE HTML>
<html style="overflow-x: hidden">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
		<link rel="shortcut icon" href="/favicon.ico" type="image/x-icon"/>
		${conditionalString(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline' 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'">`,
			!development)}
		<meta name="theme-color" content="#455A64">
		<meta name="description" content="Your password manager dashboard">
		<title>${title}</title>
		<link href="https://fonts.googleapis.com/css?family=Roboto:400,500,700" rel="stylesheet">
		${[...DEFAULT_FILES.css, css].map((defaultCSS) => {
			return `<link href="${defaultCSS}" rel="stylesheet">`;
		})}
		${[
			...await getInlinedCSS(), 
			...stylesheets
		].map((stylesheet) => {
			return `<style>${stylesheet}</style>`;
		}).join('\n')}
	</head>
	<body ${bodyStyles} ${conditionalString('class="dev"', development)}>
		<div id="app">`
}

export function postAppHTML({
	script
}: {
	script: string;
}) {
	return `</div>
		${DEFAULT_FILES.scripts.map(({ name, isModule }) => {
			return `<script ${isModule ? 'type="module"' : ''} src="${name}"></script>`;
		}).join('\n')}
		<script type="module" src="${script}"></script>
	</body>
	</html>`
}

export const html = async ({ 
	title, script, bodyStyles = '',
	development = false, stylesheets = []
}: { 
	title: string,
	script: string;
	bodyStyles?: string;
	development?: boolean;
	stylesheets?: string[];
}) => {
	return {
		pre: await preAppHTML({
			development, title, bodyStyles, stylesheets
		}),
		post: postAppHTML({
			script
		})
	}
}