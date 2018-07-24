export const html = ({ 
	title, script, stylesheet
}: { 
	title: string,
	script: string;
	stylesheet: string;
}) => ({
	pre: `
<!DOCTYPE HTML>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
		<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com">
		<!-- TODO: select color -->
		<meta name="theme-color" content="#4285f4">
		<meta name="description" content="Your password manager dashboard">
		<title>${title}</title>
		<link href="https://fonts.googleapis.com/css?family=Roboto:400,500" rel="stylesheet">
		<link rel="stylesheet" href="${stylesheet}"/>
	</head>
	<body>
		<div id="app">`,
	post: `</div>
		<script type="module" src="${script}"></script>
	</body>
</html>`
});